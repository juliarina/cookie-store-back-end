import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../config/constants.js';
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

cartRouter.use(authenticate, authorize(ROLES.CUSTOMER));

/**
 * @openapi
 * /cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get the current user's cart with totals
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cart contents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/Cart' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
cartRouter.get('/', getCartController);

/**
 * @openapi
 * /cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add an item to the cart (stock-aware)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: string, format: uuid }
 *               quantity: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       201:
 *         description: Cart item created or quantity merged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/CartItem' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Quantity exceeds available stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [false] }
 *                 error:
 *                   type: object
 *                   properties:
 *                     code: { type: string, enum: [INSUFFICIENT_STOCK] }
 *                     message: { type: string }
 */
cartRouter.post('/items', validate({ body: addCartItemSchema }), addCartItemController);

/**
 * @openapi
 * /cart/items/{productId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update the quantity of a cart item (stock-aware)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: productId, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Updated cart item
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/CartItem' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/InsufficientStock'
 */
cartRouter.patch(
  '/items/:productId',
  validate({ params: cartItemParamsSchema, body: updateCartItemSchema }),
  updateCartItemController
);

/**
 * @openapi
 * /cart/items/{productId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove an item from the cart
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: productId, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       204:
 *         description: Item removed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
cartRouter.delete(
  '/items/:productId',
  validate({ params: cartItemParamsSchema }),
  removeCartItemController
);