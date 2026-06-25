# Development conventions

## Naming

- Files and folders: `kebab-case`
- JavaScript classes: `PascalCase`
- Functions and variables: `camelCase`
- Database tables and columns: `snake_case`
- Permission codes: `module.action`
- Environment variables: `UPPER_SNAKE_CASE`

Sequelize's `underscored` option maps JavaScript attributes such as `shopkeeperId` to columns such as
`shopkeeper_id`.

## API contracts

- Prefix every endpoint with `/api/v1`.
- Return `{ success, message, data, meta? }` for successful requests.
- Return `{ success: false, error: { code, message, details? }, requestId }` for failures.
- Use stable machine-readable error codes.
- Use cursor pagination for large, changing feeds and page pagination for admin tables.
- Never accept a frontend-computed final price, account balance, permission set, or order status.
- Never expose password hashes, OTP hashes, refresh-token hashes, or provider secrets.

## Authentication

- Passwords are hashed with bcrypt.
- Access tokens are short-lived.
- Refresh tokens are stored only as hashes and rotated by token family.
- Reuse of a revoked refresh token must revoke its entire family.
- Email OTP uses the Nodemailer adapter.
- Mobile OTP has a provider interface but deliberately throws `SMS_PROVIDER_NOT_IMPLEMENTED` until a
  vendor is selected.
- OTPs are stored as hashes, expire, have bounded attempts, and are single-use.

## Authorization

Admin and staff routes require authentication, the correct actor type, and explicit permissions.
Shopkeeper routes must also enforce lifecycle state. An authenticated shopkeeper is not necessarily
approved to see prices or place orders.

## Database

- Use Sequelize CLI migrations; never use model synchronization.
- Migrations are append-only after deployment.
- Add foreign keys and indexes deliberately.
- Use transactions for multi-record state changes.
- Use row locks when confirming stock-sensitive orders.
- Use soft deletion only where business recovery requires it; financial and audit records are
  immutable instead of soft-deleted.

## Tests

- Unit tests cover policies, pricing, state transitions, and ledger balancing.
- Integration tests cover middleware, routes, database transactions, and authorization.
- Every bug fix includes a regression test.
- Provider adapters are mocked at the boundary.

## Definition of done for a module

1. API contract and status transitions are documented.
2. Migration, model, associations, indexes, and seed data are reviewed.
3. Validation, controller, service, repository, permissions, and audit behavior are implemented.
4. Transactions and idempotency are explicit.
5. Unit and integration tests pass.
6. OpenAPI documentation is updated.
7. Logs contain useful context without secrets.
