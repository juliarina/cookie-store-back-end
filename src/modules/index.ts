import { Router } from 'express';
import { authRouter, meRouter } from './auth/auth.routes.js';
import { userRouter } from './users/user.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/me', meRouter);
apiRouter.use('/users', userRouter);