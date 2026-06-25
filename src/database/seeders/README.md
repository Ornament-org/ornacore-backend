# Seeders

Seed only deterministic system data such as built-in roles, permission codes, and the initial chart
of accounts. Business records and production credentials must never be committed as seed data.

Create one with:

```bash
npm run db:seed:create -- seed-system-permissions
```
