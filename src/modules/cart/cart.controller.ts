import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as cartService from './cart.service.js';
import type { AddCartItemInput, UpdateCartItemInput } from './cart.validation.js';

export const getCartController = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.id);
  sendSuccess(res, { data: cart });
});

export const addCartItemController = asyncHandler(async (req: Request, res: Response) => {
  const item = await cartService.addCartItem(req.user!.id, req.validatedBody as AddCartItemInput);
  sendSuccess(res, { status: 201, data: item });
});

export const updateCartItemController = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.validatedParams as { productId: string };
  const item = await cartService.updateCartItemQuantity(
    req.user!.id,
    productId,
    req.validatedBody as UpdateCartItemInput
  );
  sendSuccess(res, { data: item });
});

export const removeCartItemController = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.validatedParams as { productId: string };
  await cartService.removeCartItem(req.user!.id, productId);
  res.status(204).end();
});