import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { PRODUCT_STATUSES, PRODUCT_TYPES } from "../../constants/app.constants.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const Product = sequelize.define(
  "Product",
  {
    id: bigIntId,
    metalId: foreignBigInt(),
    designCode: { type: DataTypes.STRING(100), allowNull: true, unique: true },
    name: { type: DataTypes.STRING(191), allowNull: false },
    slug: { type: DataTypes.STRING(220), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    productType: {
      type: DataTypes.ENUM(...Object.values(PRODUCT_TYPES)),
      allowNull: false,
      defaultValue: PRODUCT_TYPES.SIMPLE,
    },
    jewelryAttributes: { type: DataTypes.JSON, allowNull: true },
    status: {
      type: DataTypes.ENUM(...Object.values(PRODUCT_STATUSES)),
      allowNull: false,
      defaultValue: PRODUCT_STATUSES.DRAFT,
    },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
    createdByUserId: foreignBigInt(),
    updatedByUserId: foreignBigInt({ allowNull: true }),
  },
  {
    ...modelOptions("products", {
      indexes: [{ fields: ["metal_id", "status"] }, { fields: ["name"] }],
    }),
  },
);

export default Product;
