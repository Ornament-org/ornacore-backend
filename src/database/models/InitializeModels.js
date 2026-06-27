import { Sequelize } from "sequelize";
import { sequelize } from "../../config/database.js";
import identityAssociations from "./associations/identity.associations.js";
import catalogAssociations from "./associations/catalog.associations.js";
import commerceAssociations from "./associations/commerce.associations.js";
import operationsAssociations from "./associations/operations.associations.js";
import ledgerAssociations from "./associations/ledger.associations.js";

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Identity and access models
db.User = (await import("../../modules/auth/user.model.js")).default;
db.RefreshToken = (await import("../../modules/auth/refresh-token.model.js")).default;
db.OtpChallenge = (await import("../../modules/auth/otp-challenge.model.js")).default;
db.StaffProfile = (await import("../../modules/staff/staff-profile.model.js")).default;
db.Role = (await import("../../modules/roles/role.model.js")).default;
db.UserRole = (await import("../../modules/roles/user-role.model.js")).default;
db.Permission = (await import("../../modules/permissions/permission.model.js")).default;
db.RolePermission = (await import("../../modules/permissions/role-permission.model.js")).default;
db.ShopkeeperProfile = (
  await import("../../modules/shopkeepers/shopkeeper-profile.model.js")
).default;
db.ShopkeeperAddress = (
  await import("../../modules/shopkeepers/shopkeeper-address.model.js")
).default;
db.ShopkeeperMetalCreditLimit = (
  await import("../../modules/shopkeepers/shopkeeper-metal-credit-limit.model.js")
).default;

// Catalog and media models
db.Media = (await import("../../modules/media/media.model.js")).default;
db.Metal = (await import("../../modules/metals/metal.model.js")).default;
db.Category = (await import("../../modules/categories/category.model.js")).default;
db.Product = (await import("../../modules/products/product.model.js")).default;
db.ProductCategoryMapping = (
  await import("../../modules/products/product-category-mapping.model.js")
).default;
db.ProductImage = (await import("../../modules/products/product-image.model.js")).default;
db.ProductVariant = (
  await import("../../modules/product-variants/product-variant.model.js")
).default;

// Pricing and inventory models
db.PriceGroup = (await import("../../modules/pricing/price-group.model.js")).default;
db.PricingRule = (await import("../../modules/pricing/pricing-rule.model.js")).default;
db.ShopkeeperPriceOverride = (
  await import("../../modules/pricing/shopkeeper-price-override.model.js")
).default;
db.Inventory = (await import("../../modules/inventory/inventory.model.js")).default;
db.InventoryMovement = (
  await import("../../modules/inventory/inventory-movement.model.js")
).default;

// Commerce and operations models
db.Cart = (await import("../../modules/carts/cart.model.js")).default;
db.CartItem = (await import("../../modules/carts/cart-item.model.js")).default;
db.Order = (await import("../../modules/orders/order.model.js")).default;
db.OrderItem = (await import("../../modules/orders/order-item.model.js")).default;
db.OrderStatusHistory = (
  await import("../../modules/orders/order-status-history.model.js")
).default;
db.Payment = (await import("../../modules/payments/payment.model.js")).default;
db.Delivery = (await import("../../modules/delivery/delivery.model.js")).default;
db.Notification = (await import("../../modules/notifications/notification.model.js")).default;
db.AuditLog = (await import("../../modules/audit-logs/audit-log.model.js")).default;

// Double-entry accounts ledger models
db.LedgerAccount = (await import("../../modules/accounts-ledger/ledger-account.model.js")).default;
db.JournalEntry = (await import("../../modules/accounts-ledger/journal-entry.model.js")).default;
db.JournalLine = (await import("../../modules/accounts-ledger/journal-line.model.js")).default;
db.LedgerTransaction = (
  await import("../../modules/metal-ledger/ledger-transaction.model.js")
).default;
db.LedgerEntry = (await import("../../modules/metal-ledger/ledger-entry.model.js")).default;

// Jewellery khatabook models
db.KhatabookOrder = (await import("../../modules/khatabook/khatabook-order.model.js")).default;
db.KhatabookOrderItem = (
  await import("../../modules/khatabook/khatabook-order-item.model.js")
).default;
db.KhatabookCollection = (
  await import("../../modules/khatabook/khatabook-collection.model.js")
).default;
db.KhatabookSettlement = (
  await import("../../modules/khatabook/khatabook-settlement.model.js")
).default;
db.KhatabookLedgerEntry = (
  await import("../../modules/khatabook/khatabook-ledger-entry.model.js")
).default;

// Feature flags
db.FeatureFlag = (await import("../../modules/feature-flags/feature-flag.model.js")).default;
db.FeatureFlagAudit = (
  await import("../../modules/feature-flags/feature-flag-audit.model.js")
).default;

// Variant attribute system
db.Attribute = (await import("../../modules/attributes/attribute.model.js")).default;
db.AttributeValue = (await import("../../modules/attributes/attribute-value.model.js")).default;
db.ProductVariantAttribute = (
  await import("../../modules/attributes/product-variant-attribute.model.js")
).default;

identityAssociations(db);
catalogAssociations(db);
commerceAssociations(db);
operationsAssociations(db);
ledgerAssociations(db);

export default db;
