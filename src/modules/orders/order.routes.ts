import { Router } from 'express';
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

export const orderRouter = Router();

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Checkout from the authenticated user's cart
 *     description: |
 *       Requires a logged-in customer. The user's cart is checked out and cleared after.
 *       Guest checkout is not supported. Stock is reserved atomically inside a transaction.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, city, address]
 *             properties:
 *               name: { type: string, maxLength: 100 }
 *               email: { type: string, format: email }
 *               phone: { type: string, maxLength: 30 }
 *               city: { type: string, maxLength: 100 }
 *               address: { type: string, maxLength: 300 }
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/InsufficientStock'
 */
orderRouter.post('/', authenticate, checkoutLimiter, validate({ body: checkoutSchema }), checkoutController);

orderRouter.use(authenticate);

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders (own for customers, all for admins), cursor-paginated
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: cursor, in: query, schema: { type: string, format: uuid }, description: Opaque cursor from a previous page }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       200:
 *         description: Page of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders: { type: array, items: { $ref: '#/components/schemas/Order' } }
 *                     nextCursor: { type: string, format: uuid, nullable: true }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
orderRouter.get('/', validate({ query: listOrdersQuerySchema }), listOrdersController);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get an order (owner or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Order detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
orderRouter.get('/:id', validate({ params: orderParamsSchema }), getOrderController);

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Transition an order's status (admin)
 *     description: Allowed transitions — PENDING → PAID/PROCESSING/CANCELLED, PAID → PROCESSING/CANCELLED, PROCESSING → SHIPPED/CANCELLED, SHIPPED → DELIVERED. DELIVERED and CANCELLED are terminal.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED] }
 *     responses:
 *       200:
 *         description: Order with updated status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/Order' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [false] }
 *                 error:
 *                   type: object
 *                   properties:
 *                     code: { type: string, enum: [CONFLICT] }
 *                     message: { type: string }
 */
orderRouter.patch(
  '/:id/status',
  authorize(ROLES.ADMIN),
  validate({ params: orderParamsSchema, body: updateOrderStatusSchema }),
  updateOrderStatusController
);