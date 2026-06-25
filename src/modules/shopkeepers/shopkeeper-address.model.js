import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const ShopkeeperAddress = sequelize.define(
  "ShopkeeperAddress",
  {
    id: bigIntId,
    shopkeeperId: foreignBigInt(),
    label: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "Primary" },
    contactName: { type: DataTypes.STRING(191), allowNull: true },
    contactMobile: { type: DataTypes.STRING(32), allowNull: true },
    addressLine1: { type: DataTypes.STRING(255), allowNull: false },
    addressLine2: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(120), allowNull: false },
    state: { type: DataTypes.STRING(120), allowNull: false },
    pincode: { type: DataTypes.STRING(12), allowNull: false },
    country: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "India" },
    isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    ...modelOptions("shopkeeper_addresses", {
      indexes: [
        { fields: ["shopkeeper_id", "is_primary"] },
        { fields: ["shopkeeper_id", "is_active"] },
      ],
    }),
  },
);

export default ShopkeeperAddress;
