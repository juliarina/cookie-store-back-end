import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as productService from './product.service.js';
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from './product.validation.js';

export const listProductsController = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.listProducts(req.validatedQuery as ListProductsQuery);
  sendSuccess(res, { data: result.products, meta: { pagination: result.pagination } });
});

export const getProductController = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductBySlug(
    (req.validatedParams as { slug: string }).slug
  );
  sendSuccess(res, { data: product });
});

export const createProductController = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.validatedBody as CreateProductInput);
  sendSuccess(res, { status: 201, data: product });
});

export const updateProductController = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(
    (req.validatedParams as { id: string }).id,
    req.validatedBody as UpdateProductInput
  );
  sendSuccess(res, { data: product });
});

export const deleteProductController = asyncHandler(async (req: Request, res: Response) => {
  await productService.softDeleteProduct((req.validatedParams as { id: string }).id);
  res.status(204).end();
});