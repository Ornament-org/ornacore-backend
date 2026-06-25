# OrnaCore Backend

Production-oriented modular monolith for the B2B jewelry ordering platform.

This repository contains the complete MVP backend foundation and live module APIs for admin/staff
operations and the approved-shopkeeper ordering flow.

<!-- Create super admin -->
SUPER_ADMIN_EMAIL='akashgupta.webdev@gmail.com' SUPER_ADMIN_PASSWORD='Ak@1611xx' npm run auth:create-admin


## Confirmed decisions

- Node.js with Express 5 and ECMAScript modules (`import` / `export`)
- JavaScript, npm, MySQL, Sequelize, and Sequelize CLI
- Auto-increment unsigned `BIGINT` primary keys
- INR as the base currency; application timezone is explicitly configured through the environment
- JWT access and rotating refresh-token architecture
- Password, email OTP, and mobile OTP authentication surfaces
- Nodemailer for email; SMS provider remains an adapter until a vendor is selected
- Zod validation, Pino logging, Redis cache, Cloudinary media, Jest tests
- One shop per shopkeeper account
- Proper double-entry accounts ledger
- GST/tax snapshots are supported structurally, but tax calculation is not implemented yet
- Docker services for API, MySQL, and Redis

## Start locally

1. Copy `.env.example` to `.env`.
2. Set `APP_TIMEZONE` explicitly and replace every secret/credential placeholder.
3. Start dependencies with `docker compose up mysql redis -d`.
4. Create the database with `npm run db:create`.
5. Apply migrations with `npm run db:migrate`.
6. Seed roles, permissions, metals, price groups, and ledger accounts with `npm run db:seed`.
7. Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`, then run
   `npm run auth:create-admin`.
8. Start the API with `npm run dev`.

The liveness endpoint is `GET /api/v1/health`. OpenAPI UI is available at `/docs`.

> `sequelize.sync()` is deliberately not used. Schema changes must be committed as reviewed
> migrations.

## Useful commands

```bash
npm run dev
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run db:sync
npm run db:migrate
npm run db:migrate:undo
npm run db:seed
```

`npm run db` and `npm run db:sync` are convenient schema-sync commands. Both safely apply pending
Sequelize migrations; neither uses `sequelize.sync()`.

## Source layout

```text
src/
├── bootstrap/                 # Infrastructure startup orchestration
├── config/                    # Validated environment and provider configuration
├── constants/                 # Shared enums and permission codes
├── database/
│   ├── migrations/            # Sequelize CLI schema history
│   ├── models/
│   │   ├── InitializeModels.js
│   │   └── associations/      # Domain-grouped model associations
│   └── seeders/
├── integrations/              # Cloudinary, Redis, mail, and OTP adapters
├── middlewares/               # HTTP authentication, authorization, validation, errors
├── modules/                   # Business capabilities, one owner per domain
├── routes/                    # Root route composition only
├── shared/                    # Domain-neutral infrastructure helpers
├── app.js                     # Express composition
└── server.js                  # Process lifecycle and graceful shutdown
```

Read [Architecture](docs/architecture.md), [Module map](docs/modules.md),
[Development conventions](docs/development-conventions.md), and
[Staff onboarding](docs/staff-onboarding.md) before implementing a module. Catalog work is
documented in [Unified category hierarchy](docs/category-hierarchy.md).

Implemented modules include authentication, RBAC, staff, shopkeepers, media, catalog, products,
pricing, inventory, carts, orders, delivery, payments, notifications, reports, audit logs, and the
double-entry accounts ledger. See [Authentication API](docs/auth-api.md) for admin creation and curl
examples.
# ornacore-backend
