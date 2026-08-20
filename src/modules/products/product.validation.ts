import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  sort: z
    .enum(['price', '-price', 'rating', '-rating', 'newest', '-newest'])
    .default('newest'),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
});

const moneySchema = z.coerce
  .number()
  .nonnegative('Price must be non-negative')
  .refine((v) => Number.isFinite(v), 'Price must be a number')
  .transform((v) => Math.round(v * 100) / 100);

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
    .max(120)
    .optional(),
  description: z.string().trim().min(1, 'Description is required').max(2000),
  price: moneySchema,
  stock: z.number().int().min(0).default(0),
  rating: z.coerce.number().min(0).max(5).default(0),
  tag: z.string().trim().max(50).optional(),
  imageUrl: z.string().trim().url('Invalid image URL').max(500).optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    price: moneySchema.optional(),
    stock: z.number().int().min(0).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    tag: z.string().trim().max(50).nullable().optional(),
    imageUrl: z.string().trim().url('Invalid image URL').max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const productSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

export const productIdParamsSchema = z.object({
  id: z.string().uuid('Invalid product id'),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;