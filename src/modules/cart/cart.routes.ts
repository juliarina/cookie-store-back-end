import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import {
  addCartItemController,
  getCartController,
  removeCartItemController,
  updateCartItemController,
} from './cart.controller.js';
import {
  addCartItemSchema,
  cartItemParamsSchema,
  updateCartItemSchema,
} from './cart.validation.js';

export const cartRouter = Router();

cartRouter.use(authenticate);

cartRouter.get('/', getCartController);
cartRouter.post('/items', validate({ body: addCartItemSchema }), addCartItemController);
cartRouter.patch(
  '/items/:productId',
  validate({ params: cartItemParamsSchema, body: updateCartItemSchema }),
  updateCartItemController
);
cartRouter.delete(
  '/items/:productId',
  validate({ params: cartItemParamsSchema }),
  removeCartItemController
);