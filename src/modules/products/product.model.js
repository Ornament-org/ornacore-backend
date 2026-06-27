import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { MAKING_TYPES, PRODUCT_STATUSES } from "../../constants/app.constants.js";
import { bigIntId, foreignBigInt, modelOptions, money, quantity } from "../../database/models/model.helpers.js";

const Product = sequelize.define(
  "Product",
  {
    id: bigIntId,
    metalId: foreignBigInt(),
    designCode: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(191), allowNull: false },
    slug: { type: DataTypes.STRING(220), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    grossWeight: quantity({ allowNull: true }),
    netWeight: quantity({ allowNull: true }),
    makingType: {
      type: DataTypes.ENUM(...Object.values(MAKING_TYPES)),
      allowNull: true,
    },
    makingValue: money({ allowNull: true }),
    defaultTunch: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    thumbnail: { type: DataTypes.STRING(500), allowNull: true },
    isB2bVisible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isB2cVisible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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
