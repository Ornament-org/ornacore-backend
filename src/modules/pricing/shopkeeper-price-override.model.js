import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  money,
} from "../../database/models/model.helpers.js";

const ShopkeeperPriceOverride = sequelize.define(
  "ShopkeeperPriceOverride",
  {
    id: bigIntId,
    shopkeeperId: foreignBigInt(),
    productVariantId: foreignBigInt(),
    overridePrice: money(),
    reason: { type: DataTypes.STRING(500), allowNull: true },
    startsAt: { type: DataTypes.DATE, allowNull: true },
    endsAt: { type: DataTypes.DATE, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdByUserId: foreignBigInt(),
  },
  {
    ...modelOptions("shopkeeper_price_overrides", {
      indexes: [{ fields: ["shopkeeper_id", "product_variant_id", "is_active"] }],
    }),
  },
);

export default ShopkeeperPriceOverride;
