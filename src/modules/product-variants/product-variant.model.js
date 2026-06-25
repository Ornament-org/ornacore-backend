import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  quantity,
} from "../../database/models/model.helpers.js";

const ProductVariant = sequelize.define(
  "ProductVariant",
  {
    id: bigIntId,
    productId: foreignBigInt(),
    sku: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(191), allowNull: true },
    purity: { type: DataTypes.STRING(50), allowNull: true },
    karat: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    tunch: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    weightGrams: quantity({ allowNull: true }),
    minimumOrderQuantity: quantity({ defaultValue: "1.000" }),
    attributes: { type: DataTypes.JSON, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    ...modelOptions("product_variants", {
      indexes: [{ fields: ["product_id", "is_active"] }],
    }),
  },
);

export default ProductVariant;
