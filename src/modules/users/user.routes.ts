import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../config/constants.js';
import { listUsersController, updateUserController } from './user.controller.js';
import { listUsersQuerySchema, updateUserSchema, userParamsSchema } from './user.validation.js';

export const userRouter = Router();

userRouter.use(authenticate, authorize(ROLES.ADMIN));

userRouter.get('/', validate({ query: listUsersQuerySchema }), listUsersController);
userRouter.patch(
  '/:id/role',
  validate({ params: userParamsSchema, body: updateUserSchema }),
  updateUserController
);