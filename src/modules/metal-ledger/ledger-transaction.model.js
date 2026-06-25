import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";
import { LEDGER_TRANSACTION_STATUSES } from "./ledger.constants.js";

const LedgerTransaction = sequelize.define(
  "LedgerTransaction",
  {
    id: bigIntId,
    shopkeeperId: foreignBigInt(),
    transactionNo: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    transactionDate: { type: DataTypes.DATEONLY, allowNull: false },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM(...Object.values(LEDGER_TRANSACTION_STATUSES)),
      allowNull: false,
      defaultValue: LEDGER_TRANSACTION_STATUSES.POSTED,
    },
    createdByUserId: foreignBigInt({ allowNull: true }),
    updatedByUserId: foreignBigInt({ allowNull: true }),
    voidedByUserId: foreignBigInt({ allowNull: true }),
    voidedAt: { type: DataTypes.DATE, allowNull: true },
    voidReason: { type: DataTypes.TEXT, allowNull: true },
  },
  { ...modelOptions("ledger_transactions") },
);

export default LedgerTransaction;
