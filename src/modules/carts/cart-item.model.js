import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  money,
  quantity,
} from "../../database/models/model.helpers.js";

const CartItem = sequelize.define(
  "CartItem",
  {
    id: bigIntId,
    cartId: foreignBigInt(),
    productVariantId: foreignBigInt(),
    quantity: quantity(),
    unitPriceSnapshot: money(),
    pricingSnapshot: { type: DataTypes.JSON, allowNull: false },
  },
  {
    ...modelOptions("cart_items", {
      indexes: [{ unique: true, fields: ["cart_id", "product_variant_id"] }],
    }),
  },
);

export default CartItem;
