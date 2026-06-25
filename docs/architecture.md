# Architecture

## Style

OrnaCore is a modular monolith. It runs as one deployable application and one transactional
database, while each business capability owns its routes, validation, orchestration, persistence,
and tests.

This provides simple deployment and cross-domain transactions for the MVP without turning the
codebase into an unstructured monolith. A module can later be extracted behind its existing service
contract if scale or ownership makes that worthwhile.

## Request flow

```text
HTTP request
  -> request ID and structured logging
  -> security headers / CORS / rate limiting
  -> route
  -> authentication
  -> actor-type and permission authorization
  -> Zod request validation
  -> controller
  -> application service (transaction boundary)
  -> repository / Sequelize model
  -> response contract
  -> audit and notification side effects
```

Controllers translate HTTP input/output only. Business decisions belong in services. Repositories
encapsulate reusable queries. Sequelize models describe persistence but must not contain workflows.

## Module dependency rules

1. A module may depend on `config`, `constants`, `integrations`, `middlewares`, and `shared`.
2. Cross-module writes must go through the owning module's service, not its controller.
3. Direct model imports are allowed only inside repositories, association registration, migrations,
   and transaction-oriented domain services that are documented as orchestration services.
4. Routes never import another module's controller.
5. Circular dependencies are prohibited.
6. Reports may read across domains but cannot mutate source records.
7. Audit logs are append-only. Ledger journal entries are immutable after posting.

## Model initialization

`src/database/models/InitializeModels.js` is the explicit registry. It follows the familiar
module-grouped model import style and then invokes association functions grouped by domain:

- identity
- catalog
- commerce
- operations
- ledger

This makes startup deterministic and keeps association code out of individual model files.

## Transactions

The service layer owns database transactions. Operations that change stock, orders, payments, or
ledger state must execute atomically. External calls such as email and Cloudinary must not be made
inside a long-running database transaction. Store the required event/record first, commit, and then
dispatch the external side effect.

## Money and precision

Database money columns use `DECIMAL(18,4)`. Weight and quantity use `DECIMAL(14,3)`. JavaScript
floating-point arithmetic must not be used for final pricing or ledger balancing. The pricing and
ledger implementation phases must introduce a decimal arithmetic library before calculations are
implemented.

Order items store immutable product, SKU, pricing, and future tax snapshots. Changing catalog or
pricing records can therefore never rewrite historical orders.

## Tax flexibility

GST calculation is outside the current scope. `taxTotal` and `taxSnapshot` fields are reserved on
orders and order items so a future tax engine can be introduced without changing historical data
contracts. No endpoint should claim GST compliance until that module is deliberately implemented
and reviewed.
