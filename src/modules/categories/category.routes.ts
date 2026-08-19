import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../config/constants.js';
import {
  createCategoryController,
  listCategoriesController,
} from './category.controller.js';
import { createCategorySchema } from './category.validation.js';

export const categoryRouter = Router();

categoryRouter.get('/', listCategoriesController);
categoryRouter.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate({ body: createCategorySchema }),
  createCategoryController
);