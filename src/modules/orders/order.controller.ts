import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as orderService from './order.service.js';
import type { CheckoutInput, ListOrdersQuery, UpdateOrderStatusInput } from './order.validation.js';

export const checkoutController = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.checkout(req.validatedBody as CheckoutInput, req.user?.id);
  sendSuccess(res, { status: 201, data: order });
});

export const listOrdersController = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validatedQuery as ListOrdersQuery;
  const isAdmin = req.user!.role === 'ADMIN';
  const result = isAdmin
    ? await orderService.listAllOrders(query)
    : await orderService.listMyOrders(req.user!.id, query);
  sendSuccess(res, { data: result.orders, meta: { nextCursor: result.nextCursor } });
});

export const getOrderController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as { id: string };
  const order = await orderService.getOrder(id, { id: req.user!.id, role: req.user!.role });
  sendSuccess(res, { data: order });
});

export const listAllOrdersController = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.listAllOrders(req.validatedQuery as ListOrdersQuery);
  sendSuccess(res, { data: result.orders, meta: { nextCursor: result.nextCursor } });
});

export const updateOrderStatusController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as { id: string };
  const order = await orderService.updateOrderStatus(id, req.validatedBody as UpdateOrderStatusInput);
  sendSuccess(res, { data: order });
});