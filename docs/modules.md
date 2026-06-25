# Module map

Each module owns its business rules. The MVP route surfaces below are implemented and mounted under
`/api/v1`.

| Module             | Owns                                                                  | Primary dependencies              |
| ------------------ | --------------------------------------------------------------------- | --------------------------------- |
| `auth`             | Users, credentials, OTP challenges, access/refresh tokens             | roles, permissions, notifications |
| `staff`            | Staff profiles and account lifecycle                                  | auth, roles                       |
| `roles`            | Roles and user-role assignments                                       | permissions                       |
| `permissions`      | Permission catalog and role mappings                                  | audit-logs                        |
| `shopkeepers`      | One-shop onboarding, approval lifecycle, salesperson assignment       | auth, pricing, media              |
| `media`            | Upload metadata and Cloudinary lifecycle                              | auth, audit-logs                  |
| `metals`           | Metal master data                                                     | media                             |
| `categories`       | Unlimited parent-child taxonomy, SEO metadata, and category media     | media                             |
| `products`         | Product identity, publishing, multi-category mapping, images          | metals, categories, media         |
| `product-variants` | SKU, purity, karat, tunch, weight, MOQ, attributes                    | products                          |
| `pricing`          | Price groups, rules, shopkeeper overrides, price snapshots            | products, shopkeepers             |
| `inventory`        | Variant stock state and append-only movements                         | product-variants, orders          |
| `carts`            | Active shopkeeper cart and price snapshots                            | shopkeepers, pricing, inventory   |
| `orders`           | Order aggregate, immutable lines, lifecycle history, staff assignment | carts, pricing, inventory         |
| `payments`         | Manual payment records and order payment state                        | orders, accounts-ledger           |
| `delivery`         | Dispatch, tracking, proof, delivery state                             | orders, media                     |
| `notifications`    | In-app/email records and provider dispatch state                      | auth                              |
| `reports`          | Read-only business projections and exports                            | all read models                   |
| `audit-logs`       | Append-only administrative action history                             | auth                              |
| `accounts-ledger`  | Chart of accounts, journals, debit/credit lines, balances             | shopkeepers, orders, payments     |

## Standard module shape

As each module is implemented, use:

```text
module-name/
├── module.model.js            # One file per persisted entity
├── module.validation.js       # Zod request and command schemas
├── module.repository.js       # Persistence queries
├── module.service.js          # Business rules and transaction boundaries
├── module.controller.js       # HTTP adapter
├── module.routes.js           # Route/middleware composition
├── module.policy.js           # Optional state/permission policy
└── __tests__/                 # Unit and integration tests
```

Do not create empty files merely to satisfy this shape. Add a layer when the module begins and give
it a real contract.

## Recommended implementation order

1. Auth
2. Roles and permissions
3. Staff
4. Shopkeeper onboarding and approval
5. Media
6. Metals and the category hierarchy
7. Products and product variants
8. Pricing
9. Inventory
10. Cart
11. Orders
12. Accounts ledger
13. Payments
14. Delivery
15. Notifications
16. Reports and audit querying
