import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../config/constants.js';
import {
  createProductController,
  deleteProductController,
  getProductController,
  listProductsController,
  updateProductController,
} from './product.controller.js';
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamsSchema,
  productSlugParamsSchema,
  updateProductSchema,
} from './product.validation.js';

export const productRouter = Router();

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List active products
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *       - { name: search, in: query, schema: { type: string }, description: Full-text search over name & description }
 *       - { name: category, in: query, schema: { type: string }, description: Category slug }
 *       - { name: sort, in: query, schema: { type: string, enum: [price, -price, rating, -rating, newest, -newest], default: newest } }
 *       - { name: minPrice, in: query, schema: { type: number, minimum: 0 } }
 *       - { name: maxPrice, in: query, schema: { type: number, minimum: 0 } }
 *     responses:
 *       200:
 *         description: Paginated products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     products: { type: array, items: { $ref: '#/components/schemas/Product' } }
 *                     pagination: { $ref: '#/components/schemas/Pagination' }
 */
productRouter.get('/', validate({ query: listProductsQuerySchema }), listProductsController);

/**
 * @openapi
 * /products/{slug}:
 *   get:
 *     tags: [Products]
 *     summary: Get a product by slug
 *     parameters:
 *       - { name: slug, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Product detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
productRouter.get(
  '/:slug',
  validate({ params: productSlugParamsSchema }),
  getProductController
);

productRouter.use(authenticate, authorize(ROLES.ADMIN));

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a product (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, price]
 *             properties:
 *               name: { type: string, maxLength: 120 }
 *               slug: { type: string, description: Lowercase kebab-case. Defaults to a slug of name }
 *               description: { type: string, maxLength: 2000 }
 *               price: { type: number, minimum: 0 }
 *               stock: { type: integer, minimum: 0, default: 0 }
 *               rating: { type: number, minimum: 0, maximum: 5, default: 0 }
 *               tag: { type: string, maxLength: 50 }
 *               imageUrl: { type: string, format: uri, maxLength: 500 }
 *               categoryId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
productRouter.post('/', validate({ body: createProductSchema }), createProductController);

/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name: { type: string, maxLength: 120 }
 *               description: { type: string, maxLength: 2000 }
 *               price: { type: number, minimum: 0 }
 *               stock: { type: integer, minimum: 0 }
 *               rating: { type: number, minimum: 0, maximum: 5 }
 *               tag: { type: string, nullable: true }
 *               imageUrl: { type: string, format: uri, nullable: true }
 *               categoryId: { type: string, format: uuid, nullable: true }
 *     responses:
 *       200:
 *         description: Updated product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
productRouter.patch(
  '/:id',
  validate({ params: productIdParamsSchema, body: updateProductSchema }),
  updateProductController
);

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Soft-delete a product (admin)
 *     description: Marks the product as inactive so it disappears from public listings.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Deleted product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data: { $ref: '#/components/schemas/Product' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
productRouter.delete(
  '/:id',
  validate({ params: productIdParamsSchema }),
  deleteProductController
);