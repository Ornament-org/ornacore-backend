import { adminAuthRouter, shopkeeperAuthRouter } from "./auth/auth.routes.js";
import { staffAdminRouter } from "./staff/staff.routes.js";
import { roleAdminRouter } from "./roles/role.routes.js";
import { permissionAdminRouter } from "./permissions/permission.routes.js";
import { rbacAdminRouter } from "./rbac/rbac.routes.js";
import { shopkeeperAdminRouter, shopkeeperProfileRouter } from "./shopkeepers/shopkeeper.routes.js";
import { mediaAdminRouter } from "./media/media.routes.js";
import { metalAdminRouter, metalShopkeeperRouter } from "./metals/metal.routes.js";
import { categoryAdminRouter, categoryShopkeeperRouter } from "./categories/category.routes.js";
import { productAdminRouter, productShopkeeperRouter } from "./products/product.routes.js";
import { productVariantAdminRouter } from "./product-variants/product-variant.routes.js";
import { pricingAdminRouter } from "./pricing/pricing.routes.js";
import { inventoryAdminRouter } from "./inventory/inventory.routes.js";
import { cartShopkeeperRouter } from "./carts/cart.routes.js";
import { orderAdminRouter, orderShopkeeperRouter } from "./orders/order.routes.js";
import { paymentAdminRouter, paymentShopkeeperRouter } from "./payments/payment.routes.js";
import { deliveryAdminRouter, deliveryShopkeeperRouter } from "./delivery/delivery.routes.js";
import { notificationShopkeeperRouter } from "./notifications/notification.routes.js";
import { reportAdminRouter } from "./reports/report.routes.js";
import { auditLogAdminRouter } from "./audit-logs/audit-log.routes.js";
import {
  accountsLedgerAdminRouter,
  accountsLedgerShopkeeperRouter,
} from "./accounts-ledger/accounts-ledger.routes.js";
import {
  metalLedgerShopAdminRouter,
  metalLedgerShopkeeperRouter,
  metalLedgerTransactionAdminRouter,
} from "./metal-ledger/ledger.routes.js";
import { khatabookAdminRouter } from "./khatabook/khatabook.routes.js";
import { env } from "../config/env.js";
import { testRouter } from "./test/test.routes.js";

export const moduleRoutes = [
  ...(env.NODE_ENV !== "production" ? [{ path: "/test", router: testRouter }] : []),
  { path: "/admin/auth", router: adminAuthRouter },
  { path: "/shopkeeper/auth", router: shopkeeperAuthRouter },
  { path: "/admin/staff", router: staffAdminRouter },
  { path: "/admin/roles", router: roleAdminRouter },
  { path: "/admin/permissions", router: permissionAdminRouter },
  { path: "/admin/rbac", router: rbacAdminRouter },
  { path: "/admin/shopkeepers", router: shopkeeperAdminRouter },
  { path: "/shopkeeper/profile", router: shopkeeperProfileRouter },
  { path: "/admin/media", router: mediaAdminRouter },
  { path: "/admin/metals", router: metalAdminRouter },
  { path: "/shopkeeper/metals", router: metalShopkeeperRouter },
  { path: "/admin/categories", router: categoryAdminRouter },
  { path: "/shopkeeper/categories", router: categoryShopkeeperRouter },
  { path: "/admin/products", router: productAdminRouter },
  { path: "/shopkeeper/products", router: productShopkeeperRouter },
  { path: "/admin/product-variants", router: productVariantAdminRouter },
  { path: "/admin/pricing", router: pricingAdminRouter },
  { path: "/admin/inventory", router: inventoryAdminRouter },
  { path: "/shopkeeper/cart", router: cartShopkeeperRouter },
  { path: "/admin/orders", router: orderAdminRouter },
  { path: "/shopkeeper/orders", router: orderShopkeeperRouter },
  { path: "/admin/payments", router: paymentAdminRouter },
  { path: "/shopkeeper/payments", router: paymentShopkeeperRouter },
  { path: "/admin/delivery", router: deliveryAdminRouter },
  { path: "/shopkeeper/delivery", router: deliveryShopkeeperRouter },
  { path: "/shopkeeper/notifications", router: notificationShopkeeperRouter },
  { path: "/admin/reports", router: reportAdminRouter },
  { path: "/admin/audit-logs", router: auditLogAdminRouter },
  { path: "/admin/accounts-ledger", router: accountsLedgerAdminRouter },
  { path: "/shopkeeper/accounts-ledger", router: accountsLedgerShopkeeperRouter },
  { path: "/admin/shops", router: metalLedgerShopAdminRouter },
  { path: "/admin/ledger-transactions", router: metalLedgerTransactionAdminRouter },
  { path: "/admin/khatabook", router: khatabookAdminRouter },
  { path: "/shopkeeper/ledger", router: metalLedgerShopkeeperRouter },
];
