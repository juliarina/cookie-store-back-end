# Crumb & Co. — Backend API

E-commerce backend for the "Crumb & Co." cookie shop (frontend: `online-shop-vibe`).

## Stack

- Node.js 20+ · Express 5 · TypeScript (ESM)
- PostgreSQL · Prisma ORM
- JWT (access + refresh) auth with RBAC
- Winston logging, zod validation, helmet, rate limiting
- Vitest unit + integration suites (isolated `cookie_store_test` DB)

## Features

- **Auth & users** — register, login, refresh-token rotation with reuse detection, logout, `me`, admin user management (list, role/isActive patch)
- **Catalog** — public product listings with search (pg_trgm), filters, sorting, pagination; admin CRUD with soft delete
- **Cart** — customer-only per-user cart, stock-aware add/update/remove, totals (subtotal + flat `DELIVERY_FEE`)
- **Orders** — atomic checkout (transactional stock decrement), guest checkout, cursor-paginated order lists (customers see their own, admins see all, IDOR-protected), admin status transitions with a whitelist
- **Payments** — `PaymentProvider` abstraction; `mock` provider out of the box, `stripe` provider slot ready

## Quick start

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy env and adjust values:

   ```sh
   cp .env.example .env
   ```

3. Start Postgres + Redis (Docker):

   ```sh
   docker compose up -d
   ```

4. Run migration and seed:

   ```sh
   npm run db:migrate
   npm run db:seed
   ```

5. Start the dev server:

   ```sh
   npm run dev
   ```

Health check: `GET http://localhost:4000/health`

Interactive API docs (Swagger UI): `GET http://localhost:4000/api-docs`

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start dev server with watch (tsx) |
| `npm run build` | Compile TS to `dist/` |
| `npm run start` | Start production server (`dist/server.js`, build first) |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | ESLint |
| `npm test` | Run tests (Vitest) |
| `npm run db:migrate` | Create + apply Prisma migration |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:seed` | Seed demo catalog + admin user (tsx) |
| `npm run db:studio` | Open Prisma Studio |

Seeded demo admin: `admin@crumbco.dev` / `Admin123!` (see `prisma/seed.ts`).

## Tests

```sh
npm test
```

- Unit: `tests/unit/` (pagination, token service, auth validation)
- Integration: `tests/integration/` (auth, catalog, cart, orders) via Supertest
- The test DB (`cookie_store_test`) is migrated in `tests/global-setup.ts` and reset per test file (`tests/setup.ts`); rate limiting is bypassed under `NODE_ENV=test`.

## Project structure

```
src/
├── app.ts            # Express app assembly
├── server.ts         # Bootstrap + graceful shutdown
├── config/           # env validation, constants
├── lib/              # prisma, logger, redis, asyncHandler
├── middleware/       # auth, validation, rate limiting, errors
├── types/            # global type augmentations (e.g. Express Request)
├── modules/          # feature modules (auth, users, products, ...)
└── utils/            # ApiError, ApiResponse, pagination, password
prisma/
├── schema.prisma     # data model
├── migrations/       # versioned migrations
└── seed.ts           # demo data
```

## API conventions

- Base path: `/api/v1`
- Success: `{ success: true, data, meta? }`
- Error: `{ success: false, error: { code, message, details? } }`
- Every response echoes `X-Request-Id`.

## Endpoints

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/auth/register` | — | Create a customer account |
| POST | `/auth/login` | — | Login, sets refresh cookie |
| POST | `/auth/refresh` | cookie | Rotate the refresh token |
| POST | `/auth/logout` | — | Revoke refresh token, clears cookie |
| GET | `/me` | any | Current user profile |
| PATCH | `/me` | any | Update own profile |
| GET | `/users` | admin | List users |
| PATCH | `/users/:id` | admin | Update role / isActive |
| GET | `/products` | — | List with search/filters/pagination |
| GET | `/products/:slug` | — | Product detail |
| POST | `/products` | admin | Create product |
| PATCH | `/products/:id` | admin | Update product |
| DELETE | `/products/:id` | admin | Soft-delete product |
| GET | `/cart` | customer | Cart with totals |
| POST | `/cart/items` | customer | Add item (stock-aware) |
| PATCH | `/cart/items/:itemId` | customer | Update quantity |
| DELETE | `/cart/items/:itemId` | customer | Remove item |
| POST | `/orders` | any | Checkout (auth user or guest `items`) |
| GET | `/orders` | any | Own (customer) / all (admin), cursor-paginated |
| GET | `/orders/:id` | any | Order detail (owner or admin) |
| PATCH | `/orders/:id/status` | admin | Transition order status |

Full endpoint map and design: see `issue.md`.