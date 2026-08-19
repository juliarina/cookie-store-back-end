import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import {
  loginController,
  logoutController,
  refreshController,
  registerController,
} from './auth.controller.js';
import { loginSchema, registerSchema, updateMeSchema } from './auth.validation.js';
import { getMeController, updateMeController } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), registerController);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), loginController);
authRouter.post('/refresh', authLimiter, refreshController);
authRouter.post('/logout', logoutController);

export const meRouter = Router();

meRouter.use(authenticate);
meRouter.get('/', getMeController);
meRouter.patch('/', validate({ body: updateMeSchema }), updateMeController);