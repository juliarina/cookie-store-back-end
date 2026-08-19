import { Router } from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { checkoutLimiter } from '../../middleware/rateLimit.js';
import { ROLES } from '../../config/constants.js';
import {
  checkoutController,
  getOrderController,
  listOrdersController,
  updateOrderStatusController,
} from './order.controller.js';
import {
  checkoutSchema,
  listOrdersQuerySchema,
  orderParamsSchema,
  updateOrderStatusSchema,
} from './order.validation.js';

const optionalAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  return next();
};

export const orderRouter = Router();

orderRouter.post(
  '/',
  optionalAuth,
  checkoutLimiter,
  validate({ body: checkoutSchema }),
  checkoutController
);

orderRouter.use(authenticate);

orderRouter.get('/', validate({ query: listOrdersQuerySchema }), listOrdersController);
orderRouter.get('/:id', validate({ params: orderParamsSchema }), getOrderController);
orderRouter.patch(
  '/:id/status',
  authorize(ROLES.ADMIN),
  validate({ params: orderParamsSchema, body: updateOrderStatusSchema }),
  updateOrderStatusController
);