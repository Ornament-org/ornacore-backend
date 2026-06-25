export default function commerceAssociations(db) {
  db.ShopkeeperProfile.hasMany(db.ShopkeeperMetalCreditLimit, {
    foreignKey: "shopkeeperId",
    as: "metalCreditLimits",
  });
  db.ShopkeeperMetalCreditLimit.belongsTo(db.ShopkeeperProfile, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });
  db.Metal.hasMany(db.ShopkeeperMetalCreditLimit, {
    foreignKey: "metalId",
    as: "shopkeeperCreditLimits",
  });
  db.ShopkeeperMetalCreditLimit.belongsTo(db.Metal, {
    foreignKey: "metalId",
    as: "metal",
  });

  db.PricingRule.belongsTo(db.Product, { foreignKey: "productId", as: "product" });
  db.PricingRule.belongsTo(db.ProductVariant, {
    foreignKey: "productVariantId",
    as: "variant",
  });
  db.PricingRule.belongsTo(db.PriceGroup, { foreignKey: "priceGroupId", as: "priceGroup" });

  db.ShopkeeperPriceOverride.belongsTo(db.ShopkeeperProfile, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });
  db.ShopkeeperPriceOverride.belongsTo(db.ProductVariant, {
    foreignKey: "productVariantId",
    as: "variant",
  });

  db.ProductVariant.hasOne(db.Inventory, {
    foreignKey: "productVariantId",
    as: "inventory",
  });
  db.Inventory.belongsTo(db.ProductVariant, {
    foreignKey: "productVariantId",
    as: "variant",
  });
  db.Inventory.hasMany(db.InventoryMovement, {
    foreignKey: "inventoryId",
    as: "movements",
  });
  db.InventoryMovement.belongsTo(db.Inventory, {
    foreignKey: "inventoryId",
    as: "inventory",
  });

  db.ShopkeeperProfile.hasMany(db.Cart, { foreignKey: "shopkeeperId", as: "carts" });
  db.Cart.belongsTo(db.ShopkeeperProfile, { foreignKey: "shopkeeperId", as: "shopkeeper" });
  db.Cart.hasMany(db.CartItem, { foreignKey: "cartId", as: "items" });
  db.CartItem.belongsTo(db.Cart, { foreignKey: "cartId", as: "cart" });
  db.CartItem.belongsTo(db.ProductVariant, {
    foreignKey: "productVariantId",
    as: "variant",
  });

  db.ShopkeeperProfile.hasMany(db.Order, { foreignKey: "shopkeeperId", as: "orders" });
  db.Order.belongsTo(db.ShopkeeperProfile, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });
  db.Order.belongsTo(db.User, { foreignKey: "placedByUserId", as: "placedBy" });
  db.Order.belongsTo(db.StaffProfile, { foreignKey: "assignedStaffId", as: "assignedStaff" });
  db.Order.hasMany(db.OrderItem, { foreignKey: "orderId", as: "items" });
  db.OrderItem.belongsTo(db.Order, { foreignKey: "orderId", as: "order" });
  db.OrderItem.belongsTo(db.Product, { foreignKey: "productId", as: "product" });
  db.OrderItem.belongsTo(db.ProductVariant, {
    foreignKey: "productVariantId",
    as: "variant",
  });
  db.Order.hasMany(db.OrderStatusHistory, { foreignKey: "orderId", as: "statusHistory" });
  db.OrderStatusHistory.belongsTo(db.Order, { foreignKey: "orderId", as: "order" });

  db.Order.hasMany(db.Payment, { foreignKey: "orderId", as: "payments" });
  db.Payment.belongsTo(db.Order, { foreignKey: "orderId", as: "order" });
  db.Payment.belongsTo(db.ShopkeeperProfile, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });

  db.Order.hasOne(db.Delivery, { foreignKey: "orderId", as: "delivery" });
  db.Delivery.belongsTo(db.Order, { foreignKey: "orderId", as: "order" });
  db.Delivery.belongsTo(db.Media, { foreignKey: "proofMediaId", as: "proofMedia" });

  db.ShopkeeperProfile.hasMany(db.KhatabookOrder, {
    foreignKey: "shopkeeperId",
    as: "khatabookOrders",
  });
  db.KhatabookOrder.belongsTo(db.ShopkeeperProfile, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });
  db.Metal.hasMany(db.KhatabookOrder, { foreignKey: "metalId", as: "khatabookOrders" });
  db.KhatabookOrder.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.KhatabookOrder.hasMany(db.KhatabookOrderItem, {
    foreignKey: "khatabookOrderId",
    as: "items",
  });
  db.KhatabookOrderItem.belongsTo(db.KhatabookOrder, {
    foreignKey: "khatabookOrderId",
    as: "order",
  });

  db.KhatabookOrder.hasMany(db.KhatabookCollection, {
    foreignKey: "sourceOrderId",
    as: "collections",
  });
  db.KhatabookCollection.belongsTo(db.KhatabookOrder, {
    foreignKey: "sourceOrderId",
    as: "sourceOrder",
  });
  db.KhatabookCollection.belongsTo(db.ShopkeeperProfile, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });
  db.KhatabookCollection.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.KhatabookCollection.hasMany(db.KhatabookSettlement, {
    foreignKey: "collectionId",
    as: "settlements",
  });
  db.KhatabookSettlement.belongsTo(db.KhatabookCollection, {
    foreignKey: "collectionId",
    as: "collection",
  });
  db.KhatabookOrder.hasMany(db.KhatabookSettlement, {
    foreignKey: "khatabookOrderId",
    as: "settlements",
  });
  db.KhatabookSettlement.belongsTo(db.KhatabookOrder, {
    foreignKey: "khatabookOrderId",
    as: "order",
  });

  db.KhatabookLedgerEntry.belongsTo(db.ShopkeeperProfile, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });
  db.KhatabookLedgerEntry.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.KhatabookLedgerEntry.belongsTo(db.KhatabookOrder, {
    foreignKey: "khatabookOrderId",
    as: "order",
  });
  db.KhatabookLedgerEntry.belongsTo(db.KhatabookCollection, {
    foreignKey: "collectionId",
    as: "collection",
  });
}
