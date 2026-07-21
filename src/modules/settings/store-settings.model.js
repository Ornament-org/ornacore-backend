import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, modelOptions } from "../../database/models/model.helpers.js";

const StoreSettings = sequelize.define(
  "StoreSettings",
  {
    id: bigIntId,
    businessName: { type: DataTypes.STRING(200), allowNull: true },
    displayName: { type: DataTypes.STRING(200), allowNull: true },
    logo: { type: DataTypes.TEXT, allowNull: true },
    favicon: { type: DataTypes.TEXT, allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "INR" },
    timezone: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "Asia/Kolkata" },
    dateFormat: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "DD MMM YYYY" },
    updatedByUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  },
  {
    ...modelOptions("store_settings"),
  },
);

export default StoreSettings;
