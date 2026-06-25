import { env } from "./env.js";

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: env.APP_NAME,
    version: "0.1.0",
    description: "API contract for the OrnaCore modular monolith.",
  },
  servers: [{ url: `${env.APP_BASE_URL}${env.API_PREFIX}` }],
  tags: [
    { name: "System" },
    { name: "Admin Authentication" },
    { name: "Shopkeeper Authentication" },
    { name: "Staff & RBAC" },
    { name: "Shopkeepers" },
    { name: "Catalog" },
    { name: "Products" },
    { name: "Pricing" },
    { name: "Inventory" },
    { name: "Orders" },
    { name: "Payments" },
    { name: "Delivery" },
    { name: "Reports" },
    { name: "Audit Logs" },
    { name: "Accounts Ledger" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Liveness check",
        responses: {
          200: {
            description: "Service is alive",
          },
        },
      },
    },
    "/admin/auth/login": {
      post: {
        tags: ["Admin Authentication"],
        summary: "Login an admin or staff user with email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful" },
          401: { description: "Invalid credentials or inactive account" },
        },
      },
    },
    "/admin/auth/refresh": {
      post: {
        tags: ["Admin Authentication"],
        summary: "Rotate an admin/staff refresh token",
        responses: {
          200: { description: "Session refreshed" },
          401: { description: "Refresh token invalid, expired, revoked, or reused" },
        },
      },
    },
    "/admin/auth/me": {
      get: {
        tags: ["Admin Authentication"],
        summary: "Get the authenticated admin/staff user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Authenticated user" },
          401: { description: "Invalid access token" },
        },
      },
    },
    "/admin/auth/change-password": {
      post: {
        tags: ["Admin Authentication"],
        summary: "Replace a temporary or existing admin/staff password",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Password changed; active sessions revoked" },
          401: { description: "Current password is invalid" },
        },
      },
    },
    "/shopkeeper/auth/register": {
      post: {
        tags: ["Shopkeeper Authentication"],
        summary: "Register a shopkeeper and submit the shop for approval",
        responses: {
          201: { description: "Registration submitted for review" },
          409: { description: "Email or mobile is already registered" },
          422: { description: "Request validation failed" },
        },
      },
    },
    "/shopkeeper/auth/login": {
      post: {
        tags: ["Shopkeeper Authentication"],
        summary: "Login a shopkeeper with email/mobile and password",
        responses: {
          200: { description: "Login successful" },
          401: { description: "Invalid credentials or inactive account" },
          403: { description: "Shopkeeper is blocked" },
        },
      },
    },
    "/shopkeeper/auth/refresh": {
      post: {
        tags: ["Shopkeeper Authentication"],
        summary: "Rotate a shopkeeper refresh token",
        responses: {
          200: { description: "Session refreshed" },
          401: { description: "Refresh token invalid, expired, revoked, or reused" },
        },
      },
    },
    "/shopkeeper/auth/me": {
      get: {
        tags: ["Shopkeeper Authentication"],
        summary: "Get the authenticated shopkeeper",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Authenticated shopkeeper" },
          401: { description: "Invalid access token" },
        },
      },
    },
    "/admin/staff": {
      get: {
        tags: ["Staff & RBAC"],
        summary: "List staff users",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Staff list" } },
      },
      post: {
        tags: ["Staff & RBAC"],
        summary: "Create staff with generated employee code/password and email credentials",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Staff user created" } },
      },
    },
    "/admin/staff/{id}/reset-password": {
      post: {
        tags: ["Staff & RBAC"],
        summary: "Regenerate temporary credentials and resend the staff invitation email",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Credentials regenerated" } },
      },
    },
    "/admin/roles": {
      get: {
        tags: ["Staff & RBAC"],
        summary: "List roles and permissions",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Role list" } },
      },
      post: {
        tags: ["Staff & RBAC"],
        summary: "Create a custom role",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Role created" } },
      },
    },
    "/admin/shopkeepers": {
      get: {
        tags: ["Shopkeepers"],
        summary: "List and filter shopkeepers",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Shopkeeper list" } },
      },
    },
    "/admin/shopkeepers/{id}/approve": {
      post: {
        tags: ["Shopkeepers"],
        summary: "Approve a shopkeeper and open its receivable ledger",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Shopkeeper approved" } },
      },
    },
    "/admin/metals": {
      get: {
        tags: ["Catalog"],
        summary: "List metals",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Metal list" } },
      },
      post: {
        tags: ["Catalog"],
        summary: "Create a metal",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Metal created" } },
      },
    },
    "/admin/categories": {
      get: {
        tags: ["Catalog"],
        summary: "List categories from the unified parent-child hierarchy",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Category list" } },
      },
      post: {
        tags: ["Catalog"],
        summary: "Create a root or child category",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Category created" } },
      },
    },
    "/admin/categories/tree": {
      get: {
        tags: ["Catalog"],
        summary: "Fetch the complete nested and flat category tree",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Category tree" } },
      },
    },
    "/admin/media": {
      get: {
        tags: ["Catalog"],
        summary: "List uploaded media",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Media list" } },
      },
      post: {
        tags: ["Catalog"],
        summary: "Upload media through the configured provider",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Media uploaded" } },
      },
    },
    "/admin/products": {
      get: {
        tags: ["Products"],
        summary: "List products with variants and inventory",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Product list" } },
      },
      post: {
        tags: ["Products"],
        summary:
          "Create a product with multiple category mappings, one primary category, variants, stock, and pricing",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Product created" } },
      },
    },
    "/admin/pricing": {
      get: {
        tags: ["Pricing"],
        summary: "List price groups",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Price group list" } },
      },
      post: {
        tags: ["Pricing"],
        summary: "Create a price group",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Price group created" } },
      },
    },
    "/admin/pricing/rules": {
      get: {
        tags: ["Pricing"],
        summary: "List pricing rules",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Pricing rule list" } },
      },
      post: {
        tags: ["Pricing"],
        summary: "Create a pricing rule",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Pricing rule created" } },
      },
    },
    "/admin/inventory": {
      get: {
        tags: ["Inventory"],
        summary: "List variant inventory balances",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Inventory list" } },
      },
    },
    "/admin/inventory/{id}/adjust": {
      post: {
        tags: ["Inventory"],
        summary: "Post an audited inventory movement",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Inventory adjusted" } },
      },
    },
    "/admin/orders": {
      get: {
        tags: ["Orders"],
        summary: "List orders",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Order list" } },
      },
      post: {
        tags: ["Orders"],
        summary: "Create an order on behalf of a shopkeeper",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Order created" } },
      },
    },
    "/admin/orders/{id}/status": {
      post: {
        tags: ["Orders"],
        summary: "Advance an order through its controlled lifecycle",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Order status updated" } },
      },
    },
    "/admin/payments": {
      get: {
        tags: ["Payments"],
        summary: "List payment transactions",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Payment list" } },
      },
      post: {
        tags: ["Payments"],
        summary: "Record payment and post a balanced journal entry",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "Payment recorded" } },
      },
    },
    "/admin/delivery": {
      get: {
        tags: ["Delivery"],
        summary: "List delivery records",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Delivery list" } },
      },
    },
    "/admin/reports/dashboard": {
      get: {
        tags: ["Reports"],
        summary: "Get live dashboard metrics and chart datasets",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Dashboard report" } },
      },
    },
    "/admin/reports/{reportType}": {
      get: {
        tags: ["Reports"],
        summary: "Get sales, inventory, shopkeeper, product, payment, or order report",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "reportType", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Report data" } },
      },
    },
    "/admin/audit-logs": {
      get: {
        tags: ["Audit Logs"],
        summary: "Query immutable administrative audit events",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Audit log list" } },
      },
    },
    "/admin/accounts-ledger/journals": {
      get: {
        tags: ["Accounts Ledger"],
        summary: "List posted double-entry journal entries",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Journal entry list" } },
      },
    },
  },
};
