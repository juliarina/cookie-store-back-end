import { z } from 'zod';
import { ROLES } from '../../config/constants.js';

const emailSchema = z.string().trim().toLowerCase().email('Invalid email address');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: z.enum([ROLES.CUSTOMER, ROLES.ADMIN]).optional(),
});

export const registerAdminSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, 'Name is required').max(100),
});

export const updateUserSchema = z.object({
  isActive: z.boolean(),
}).strict();

export const userParamsSchema = z.object({
  id: z.string().uuid('Invalid user id'),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type RegisterAdminInput = z.infer<typeof registerAdminSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;