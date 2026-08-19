import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const emailSchema = z.string().trim().toLowerCase().email('Invalid email address');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, 'Name is required').max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined || data.password !== undefined, {
    message: 'Provide at least one field to update',
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;