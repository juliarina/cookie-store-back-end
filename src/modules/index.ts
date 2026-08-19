import { Router } from 'express';
import { authRouter, meRouter } from './auth/auth.routes.js';
import { userRouter } from './users/user.routes.js';
import { categoryRouter } from './categories/category.routes.js';
import { productRouter } from './products/product.routes.js';
import { cartRouter } from './cart/cart.routes.js';
import { orderRouter } from './orders/order.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/me', meRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/orders', orderRouter);