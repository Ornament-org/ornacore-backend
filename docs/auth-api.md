# Authentication API

## Setup

Apply the auth migrations:

```bash
npm run db:migrate
```

To create or reset the local super-admin account, set these values in `.env`:

```env
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=ChangeMe123
```

Then run:

```bash
npm run auth:create-admin
```

Do not commit real credentials. Remove `SUPER_ADMIN_PASSWORD` from `.env` after creating the account.

For local development, the same idempotent setup is available through a test controller:

```bash
curl -X POST http://localhost:4000/api/v1/test/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"ChangeMe123"}'
```

This route is mounted only outside production and accepts requests only from localhost. Calling it
again updates the same admin password, restores the account, grants every current permission, and
revokes existing refresh sessions.

To test both route groups against the running local API with disposable data:

```bash
npm run auth:smoke-test
```

The smoke test creates temporary admin and shopkeeper records and deletes them when it finishes.

## Admin login

```bash
curl -X POST http://localhost:4000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"ChangeMe123"}'
```

## Shopkeeper registration

```bash
curl -X POST http://localhost:4000/api/v1/shopkeeper/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "ownerName":"Amit Shah",
    "shopName":"Amit Jewellers",
    "email":"amit@example.com",
    "mobile":"+919876543210",
    "password":"Shopkeeper123",
    "addressLine1":"12 Market Road",
    "city":"Mumbai",
    "state":"Maharashtra",
    "pincode":"400001",
    "gstNumber":"27ABCDE1234F1Z5",
    "businessType":"RETAILER"
  }'
```

The new shopkeeper receives `PENDING_REVIEW` status and `isOrderAllowed: false`.

## Shopkeeper login

The identifier can be the registered email or mobile number.

```bash
curl -X POST http://localhost:4000/api/v1/shopkeeper/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"amit@example.com","password":"Shopkeeper123"}'
```

## Refresh session

Use the matching admin or shopkeeper refresh endpoint. Refresh tokens rotate after every successful
use; discard the old token immediately.

```bash
curl -X POST http://localhost:4000/api/v1/shopkeeper/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"PASTE_REFRESH_TOKEN"}'
```

## Current user

```bash
curl http://localhost:4000/api/v1/shopkeeper/auth/me \
  -H "Authorization: Bearer PASTE_ACCESS_TOKEN"
```

## Logout

```bash
curl -X POST http://localhost:4000/api/v1/shopkeeper/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"PASTE_REFRESH_TOKEN"}'
```
