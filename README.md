# Crumb & Co. — Backend API

E-commerce backend for the "Crumb & Co." cookie shop (frontend: `online-shop-vibe`).

## Stack

- Node.js 20+ · Express 5 · TypeScript (ESM)
- PostgreSQL · Prisma ORM
- JWT (access + refresh) auth with RBAC
- Winston logging, zod validation, helmet, rate limiting

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

Full endpoint map and design: see `issue.md`.