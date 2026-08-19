import { z } from 'zod';
import { ORDER_STATUS } from '../../config/constants.js';

const statuses = Object.values(ORDER_STATUS) as [string, ...string[]];

export const checkoutSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  phone: z.string().trim().min(1, 'Phone is required').max(30),
  city: z.string().trim().min(1, 'City is required').max(100),
  address: z.string().trim().min(1, 'Address is required').max(300),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product id'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100),
      })
    )
    .min(1, 'Provide at least one item')
    .optional(),
});

export const orderParamsSchema = z.object({
  id: z.string().uuid('Invalid order id'),
});

export const listOrdersQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(statuses as [typeof ORDER_STATUS[keyof typeof ORDER_STATUS], ...typeof ORDER_STATUS[keyof typeof ORDER_STATUS][]]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;