import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../config/constants.js';
import {
  deleteUserController,
  listUsersController,
  registerAdminController,
  updateUserController,
} from './user.controller.js';
import {
  listUsersQuerySchema,
  registerAdminSchema,
  updateUserSchema,
  userParamsSchema,
} from './user.validation.js';

export const userRouter = Router();

userRouter.use(authenticate, authorize(ROLES.ADMIN));

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *       - { name: search, in: query, schema: { type: string }, description: Filter by name or email }
 *       - { name: role, in: query, schema: { type: string, enum: [CUSTOMER, ADMIN] } }
 *     responses:
 *       200:
 *         description: Paginated users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     users: { type: array, items: { $ref: '#/components/schemas/User' } }
 *                     pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
userRouter.get('/', validate({ query: listUsersQuerySchema }), listUsersController);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate a user (admin)
 *     description: Toggles a user's active state. Roles are never changed through this endpoint — new admins are created via POST /admins.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
userRouter.patch(
  '/:id',
  validate({ params: userParamsSchema, body: updateUserSchema }),
  updateUserController
);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (admin)
 *     description: Hard-deletes a CUSTOMER account (cart, cart items, and reviews; order history is detached). Admins cannot delete themselves or other admins.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       204:
 *         description: User deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
userRouter.delete('/:id', validate({ params: userParamsSchema }), deleteUserController);

export const adminRouter = Router();

adminRouter.use(authenticate, authorize(ROLES.ADMIN));

/**
 * @openapi
 * /admins:
 *   post:
 *     tags: [Admins]
 *     summary: Register a new admin account (admin only)
 *     description: Creates an ADMIN user so multiple admins can exist. Public customers use /auth/register instead. There is no role-changing endpoint.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8, description: Must contain a letter and a number }
 *               name: { type: string, maxLength: 100 }
 *     responses:
 *       201:
 *         description: Admin created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
adminRouter.post('/', validate({ body: registerAdminSchema }), registerAdminController);