import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { DELIVERY_FEE, ORDER_STATUS, PAYMENT_STATUS } from '../../config/constants.js';
import { getPaymentProvider } from './payment/payment.index.js';
import type {
  CheckoutInput,
  ListOrdersQuery,
  UpdateOrderStatusInput,
} from './order.validation.js';

const generateOrderNumber = (): string => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `CC-${ymd}-${seq}`;
};

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  userId: true,
  status: true,
  paymentStatus: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  name: true,
  email: true,
  phone: true,
  city: true,
  address: true,
  items: { select: { id: true, productId: true, name: true, unitPrice: true, quantity: true, lineTotal: true } },
  createdAt: true,
  updatedAt: true,
} as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: [ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  PAID: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  PROCESSING: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  SHIPPED: [ORDER_STATUS.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

export const checkout = async (input: CheckoutInput, userId: string) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, price: true, stock: true, isActive: true } },
        },
      },
    },
  });
  const cartItems = (cart?.items ?? []).filter((item) => item.product.isActive);
  if (cartItems.length === 0) throw ApiError.conflict('Your cart is empty');

  const items = cartItems.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  const paymentProvider = getPaymentProvider();

  const order = await prisma.$transaction(async (tx) => {
    const orderItems: Array<{
      productId: string | null;
      name: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }> = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, price: true, stock: true, isActive: true },
      });
      if (!product || !product.isActive) {
        throw ApiError.badRequest('One or more products are no longer available', 'NOT_FOUND');
      }

      const updated = await tx.$executeRaw`
        UPDATE "Product"
        SET stock = stock - ${item.quantity}
        WHERE id = ${product.id} AND stock >= ${item.quantity}
      `;
      if (updated === 0) {
        throw ApiError.insufficientStock(`Insufficient stock for "${product.name}"`);
      }

      const unitPrice = Number(product.price);
      const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      subtotal = Math.round((subtotal + lineTotal) * 100) / 100;
      orderItems.push({
        productId: product.id,
        name: product.name,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
      });
    }

    const total = Math.round((subtotal + DELIVERY_FEE) * 100) / 100;

    let created;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId,
            status: ORDER_STATUS.PENDING,
            paymentStatus: PAYMENT_STATUS.UNPAID,
            subtotal,
            deliveryFee: DELIVERY_FEE,
            total,
            name: input.name,
            email: input.email,
            phone: input.phone,
            city: input.city,
            address: input.address,
            items: { create: orderItems },
          },
          select: ORDER_SELECT,
        });
        break;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    const payment = await paymentProvider.createPayment({
      amount: total,
      currency: 'USD',
      metadata: { orderNumber: created!.orderNumber },
    });

    const paid = payment.status === 'PAID';
    return tx.order.update({
      where: { id: created!.id },
      data: {
        paymentStatus: paid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.UNPAID,
        status: paid ? ORDER_STATUS.PAID : ORDER_STATUS.PENDING,
      },
      select: ORDER_SELECT,
    });
  });

  const cartRecord = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
  if (cartRecord) await prisma.cartItem.deleteMany({ where: { cartId: cartRecord.id } });

  return order;
};

export const listMyOrders = async (userId: string, query: ListOrdersQuery) => {
  const take = query.limit + 1;
  const orders = await prisma.order.findMany({
    where: { userId },
    select: ORDER_SELECT,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    ...(query.cursor
      ? {
          cursor: { id: query.cursor },
          skip: 1,
        }
      : {}),
  });

  const hasNext = orders.length === take;
  const visible = hasNext ? orders.slice(0, query.limit) : orders;
  return {
    orders: visible,
    nextCursor: hasNext ? visible[visible.length - 1]?.id ?? null : null,
  };
};

export const getOrder = async (id: string, actor: { id: string; role: string }) => {
  const order = await prisma.order.findUnique({
    where: { id },
    select: ORDER_SELECT,
  });
  if (!order) throw ApiError.notFound('Order not found');

  if (actor.role !== 'ADMIN' && order.userId !== actor.id) {
    throw ApiError.forbidden('You cannot view this order');
  }
  return order;
};

export const updateOrderStatus = async (id: string, input: UpdateOrderStatusInput) => {
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!order) throw ApiError.notFound('Order not found');

  if (order.status === input.status) return prisma.order.findUnique({ where: { id }, select: ORDER_SELECT });

  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw ApiError.conflict(`Cannot transition order from ${order.status} to ${input.status}`);
  }

  return prisma.order.update({ where: { id }, data: { status: input.status }, select: ORDER_SELECT });
};

export const listAllOrders = async (query: ListOrdersQuery) => {
  const take = query.limit + 1;
  const orders = await prisma.order.findMany({
    select: ORDER_SELECT,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    ...(query.cursor
      ? {
          cursor: { id: query.cursor },
          skip: 1,
        }
      : {}),
  });

  const hasNext = orders.length === take;
  const visible = hasNext ? orders.slice(0, query.limit) : orders;
  return {
    orders: visible,
    nextCursor: hasNext ? visible[visible.length - 1]?.id ?? null : null,
  };
};