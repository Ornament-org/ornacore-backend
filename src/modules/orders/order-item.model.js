import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  money,
  quantity,
} from "../../database/models/model.helpers.js";

const OrderItem = sequelize.define(
  "OrderItem",
  {
    id: bigIntId,
    orderId: foreignBigInt(),
    productId: foreignBigInt({ allowNull: true }),
    productVariantId: foreignBigInt({ allowNull: true }),
    productNameSnapshot: { type: DataTypes.STRING(191), allowNull: false },
    skuSnapshot: { type: DataTypes.STRING(100), allowNull: false },
    imageUrlSnapshot: { type: DataTypes.TEXT, allowNull: true },
    quantity: quantity(),
    unitPrice: money(),
    lineSubtotal: money(),
    discountAmount: money({ defaultValue: "0.0000" }),
    taxAmount: money({ defaultValue: "0.0000" }),
    lineTotal: money(),
    pricingSnapshot: { type: DataTypes.JSON, allowNull: false },
    taxSnapshot: { type: DataTypes.JSON, allowNull: true },
  },
  { ...modelOptions("order_items") },
);

export default OrderItem;
