import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import * as categoryService from './category.service.js';
import type { CreateCategoryInput } from './category.validation.js';

export const listCategoriesController = asyncHandler(async (req: Request, res: Response) => {
  const categories = await categoryService.listCategories();
  sendSuccess(res, { data: categories });
});

export const createCategoryController = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.validatedBody as CreateCategoryInput);
  sendSuccess(res, { status: 201, data: category });
});