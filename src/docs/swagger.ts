import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env.js';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const modulesDir = dirname(fileURLToPath(new URL('../modules', import.meta.url)));
const extension = fileURLToPath(import.meta.url).endsWith('.ts') ? '.ts' : '.js';

const findRoutesFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...findRoutesFiles(join(dir, entry.name)));
    else if (entry.name.endsWith(`.routes${extension}`)) out.push(join(dir, entry.name).replaceAll('\\', '/'));
  }
  return out;
};

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Crumb & Co. — Backend API',
      version: '0.1.0',
      description:
        'E-commerce backend for the Crumb & Co. cookie shop. Covers auth (JWT access + refresh), users, catalog (categories & products), cart, and orders with payment.',
    },
    servers: [{ url: `${env.API_URL}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from POST /auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            _count: {
              type: 'object',
              properties: { products: { type: 'integer' } },
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            slug: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            stock: { type: 'integer' },
            rating: { type: 'number' },
            tag: { type: 'string', nullable: true },
            imageUrl: { type: 'string', nullable: true },
            category: { $ref: '#/components/schemas/CategoryLite' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CategoryLite: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
          },
        },
        Cart: {
          type: 'object',
          properties: {
            cartId: { type: 'string', format: 'uuid' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/CartItem' },
            },
            subtotal: { type: 'number' },
            deliveryFee: { type: 'number' },
            total: { type: 'number' },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer' },
            product: { $ref: '#/components/schemas/ProductLite' },
          },
        },
        ProductLite: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            slug: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            imageUrl: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            stock: { type: 'integer' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderNumber: { type: 'string', example: 'CC-20260819-1234' },
            userId: { type: 'string', format: 'uuid', nullable: true },
            status: {
              type: 'string',
              enum: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
            },
            paymentStatus: { type: 'string', enum: ['UNPAID', 'PAID', 'REFUNDED'] },
            subtotal: { type: 'number' },
            deliveryFee: { type: 'number' },
            total: { type: 'number' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            city: { type: 'string' },
            address: { type: 'string' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid', nullable: true },
            name: { type: 'string' },
            unitPrice: { type: 'number' },
            quantity: { type: 'integer' },
            lineTotal: { type: 'number' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrevious: { type: 'boolean' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            accessToken: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', enum: [false] },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        ValidationError: {
          description: 'Invalid request payload',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid request body',
                  details: [
                    { field: 'email', message: 'Invalid email address' },
                    { field: 'password', message: 'Password must be at least 8 characters' },
                  ],
                },
              },
            },
          },
        },
        Unauthorized: {
          description: 'Missing or invalid access token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' },
              },
            },
          },
        },
        Forbidden: {
          description: 'Authenticated but not allowed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action' },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'NOT_FOUND', message: 'Resource not found' },
              },
            },
          },
        },
        Conflict: {
          description: 'Resource already exists or conflicts',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'CONFLICT', message: 'Resource already exists' },
              },
            },
          },
        },
        InsufficientStock: {
          description: 'Requested quantity exceeds available stock',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', enum: [false] },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', enum: ['INSUFFICIENT_STOCK'] },
                      message: { type: 'string' },
                    },
                  },
                },
              },
              example: {
                success: false,
                error: { code: 'INSUFFICIENT_STOCK', message: 'Insufficient stock for "Classic Chocolate Chip"' },
              },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Register, login, refresh & logout' },
      { name: 'Me', description: 'Current user profile' },
      { name: 'Users', description: 'Admin user management' },
      { name: 'Categories', description: 'Product categories' },
      { name: 'Products', description: 'Product catalog' },
      { name: 'Cart', description: 'Per-user shopping cart' },
      { name: 'Orders', description: 'Checkout & order management' },
    ],
  },
  apis: findRoutesFiles(modulesDir),
});

export default spec;
