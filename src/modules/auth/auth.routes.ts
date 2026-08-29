import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimit.js';
import { ROLES } from '../../config/constants.js';
import {
  loginController,
  logoutController,
  refreshController,
  registerController,
} from './auth.controller.js';
import { loginSchema, registerSchema, updateMeSchema } from './auth.validation.js';
import { deleteMeController, getMeController, updateMeController } from './auth.controller.js';

export const authRouter = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a customer account
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
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/User' }
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
authRouter.post('/register', validate({ body: registerSchema }), registerController);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive an access token
 *     description: Sets a httpOnly `refreshToken` cookie on path `/api/v1/auth`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Logged in
 *         headers:
 *           Set-Cookie: { schema: { type: string } }
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/AuthResponse' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), loginController);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate the refresh token and get a new access token
 *     description: Reads the `refreshToken` cookie and rotates it (reuse of a rotated token revokes the session).
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/AuthResponse' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
authRouter.post('/refresh', refreshLimiter, refreshController);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out and revoke the refresh token
 *     description: Idempotent. Clears the `refreshToken` cookie.
 *     responses:
 *       204:
 *         description: Logged out
 */
authRouter.post('/logout', logoutController);

export const meRouter = Router();

meRouter.use(authenticate);

/**
 * @openapi
 * /me:
 *   get:
 *     tags: [Me]
 *     summary: Get the current user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/User' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
meRouter.get('/', getMeController);

/**
 * @openapi
 * /me:
 *   patch:
 *     tags: [Me]
 *     summary: Update the current user's profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name: { type: string, maxLength: 100 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
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
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
meRouter.patch('/', validate({ body: updateMeSchema }), updateMeController);

/**
 * @openapi
 * /me:
 *   delete:
 *     tags: [Me]
 *     summary: Delete your own account (customers only)
 *     description: Hard-deletes the customer account, cart, and reviews; detaches order history (kept with snapshot name/email). Clears the refresh cookie. Admin accounts cannot be deleted via this endpoint.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204:
 *         description: Account deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
meRouter.delete('/', authorize(ROLES.CUSTOMER), deleteMeController);