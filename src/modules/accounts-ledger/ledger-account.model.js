import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const LedgerAccount = sequelize.define(
  "LedgerAccount",
  {
    id: bigIntId,
    code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(191), allowNull: false },
    accountType: {
      type: DataTypes.ENUM("ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"),
      allowNull: false,
    },
    ownerType: { type: DataTypes.ENUM("SYSTEM", "SHOPKEEPER"), allowNull: false },
    shopkeeperId: foreignBigInt({ allowNull: true }),
    parentAccountId: foreignBigInt({ allowNull: true }),
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "INR" },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    ...modelOptions("ledger_accounts", {
      indexes: [{ fields: ["shopkeeper_id", "account_type"] }],
    }),
  },
);

export default LedgerAccount;
