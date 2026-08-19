import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.string().uuid('Invalid product id'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100),
});

export const cartItemParamsSchema = z.object({
  productId: z.string().uuid('Invalid product id'),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;