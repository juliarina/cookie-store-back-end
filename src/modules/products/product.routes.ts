import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../config/constants.js';
import {
  createProductController,
  deleteProductController,
  getProductController,
  listProductsController,
  updateProductController,
} from './product.controller.js';
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamsSchema,
  productSlugParamsSchema,
  updateProductSchema,
} from './product.validation.js';

export const productRouter = Router();

productRouter.get('/', validate({ query: listProductsQuerySchema }), listProductsController);
productRouter.get(
  '/:slug',
  validate({ params: productSlugParamsSchema }),
  getProductController
);

productRouter.use(authenticate, authorize(ROLES.ADMIN));

productRouter.post('/', validate({ body: createProductSchema }), createProductController);
productRouter.patch(
  '/:id',
  validate({ params: productIdParamsSchema, body: updateProductSchema }),
  updateProductController
);
productRouter.delete(
  '/:id',
  validate({ params: productIdParamsSchema }),
  deleteProductController
);