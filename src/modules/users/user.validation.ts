import { z } from 'zod';
import { ROLES } from '../../config/constants.js';

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: z.enum([ROLES.CUSTOMER, ROLES.ADMIN]).optional(),
});

export const updateUserSchema = z
  .object({
    role: z.enum([ROLES.CUSTOMER, ROLES.ADMIN]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.isActive !== undefined, {
    message: 'Provide at least one of role or isActive',
  });

export const userParamsSchema = z.object({
  id: z.string().uuid('Invalid user id'),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;