# Migrations

Sequelize CLI migrations are the only supported way to change the database schema.

Add migrations during each module's implementation phase. Use timestamped names, create foreign-key
targets before dependants, add indexes deliberately, and provide a safe `down` function for changes
that have not reached production.

Create one with:

```bash
npm run db:migration:create -- create-users
```

Migration files use `.cjs` because Sequelize CLI 6 executes migration contracts through a CommonJS
boundary even though the application itself is ESM.

The model registry is a schema contract, but it never calls `sequelize.sync()`.
