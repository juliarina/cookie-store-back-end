import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { DELIVERY_FEE } from '../../config/constants.js';
import type { AddCartItemInput, UpdateCartItemInput } from './cart.validation.js';

export const getOrCreateCart = async (userId: string) =>
  prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

export const getCart = async (userId: string) => {
  const cart = await getOrCreateCart(userId);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          price: true,
          imageUrl: true,
          isActive: true,
          stock: true,
        },
      },
    },
  });

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );
  const total = items.length > 0 ? subtotal + DELIVERY_FEE : 0;

  return { cartId: cart.id, items, subtotal, deliveryFee: DELIVERY_FEE, total };
};

export const addCartItem = async (userId: string, input: AddCartItemInput) => {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, isActive: true, stock: true },
  });
  if (!product || !product.isActive) throw ApiError.notFound('Product not found');

  const cart = await getOrCreateCart(userId);

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
  });

  const requestedQuantity = existing ? existing.quantity + input.quantity : input.quantity;
  if (requestedQuantity > product.stock) {
    throw ApiError.insufficientStock(
      `Only ${product.stock} in stock` + (existing ? ` (you already have ${existing.quantity})` : '')
    );
  }

  const item = existing
    ? await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: requestedQuantity },
      })
    : await prisma.cartItem.create({
        data: { cartId: cart.id, productId: input.productId, quantity: input.quantity },
      });

  return item;
};

export const updateCartItemQuantity = async (
  userId: string,
  productId: string,
  input: UpdateCartItemInput
) => {
  const cart = await getOrCreateCart(userId);

  const item = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
    include: { product: { select: { stock: true } } },
  });
  if (!item) throw ApiError.notFound('Item not in cart');

  if (input.quantity > item.product.stock) {
    throw ApiError.insufficientStock(`Only ${item.product.stock} in stock`);
  }

  return prisma.cartItem.update({ where: { id: item.id }, data: { quantity: input.quantity } });
};

export const removeCartItem = async (userId: string, productId: string) => {
  const cart = await getOrCreateCart(userId);

  const item = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
    select: { id: true },
  });
  if (!item) throw ApiError.notFound('Item not in cart');

  await prisma.cartItem.delete({ where: { id: item.id } });
};

export const clearCart = async (userId: string) => {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
};