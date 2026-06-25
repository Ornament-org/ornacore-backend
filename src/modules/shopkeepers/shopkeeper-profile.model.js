import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { SHOPKEEPER_STATUSES } from "../../constants/app.constants.js";
import { bigIntId, foreignBigInt, modelOptions, money } from "../../database/models/model.helpers.js";

const ShopkeeperProfile = sequelize.define(
  "ShopkeeperProfile",
  {
    id: bigIntId,
    userId: { ...foreignBigInt(), unique: true },
    ownerName: { type: DataTypes.STRING(191), allowNull: false },
    shopName: { type: DataTypes.STRING(191), allowNull: false },
    addressLine1: { type: DataTypes.STRING(255), allowNull: true },
    addressLine2: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(120), allowNull: true },
    state: { type: DataTypes.STRING(120), allowNull: true },
    pincode: { type: DataTypes.STRING(12), allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    gstNumber: { type: DataTypes.STRING(32), allowNull: true, unique: true },
    businessType: { type: DataTypes.STRING(100), allowNull: true },
    onboardingStep: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "ACCOUNT" },
    status: {
      type: DataTypes.ENUM(...Object.values(SHOPKEEPER_STATUSES)),
      allowNull: false,
      defaultValue: SHOPKEEPER_STATUSES.DRAFT,
    },
    creditLimit: money({ defaultValue: "0.0000" }),
    isOrderAllowed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    assignedSalespersonId: foreignBigInt({ allowNull: true }),
    approvedByUserId: foreignBigInt({ allowNull: true }),
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    lastTransactionAt: { type: DataTypes.DATE, allowNull: true },
  },
  { ...modelOptions("shopkeeper_profiles") },
);

export default ShopkeeperProfile;
