import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  money,
  quantity,
} from "../../database/models/model.helpers.js";
import { LEDGER_ENTRY_TYPES } from "./ledger.constants.js";

const LedgerEntry = sequelize.define(
  "LedgerEntry",
  {
    id: bigIntId,
    ledgerTransactionId: foreignBigInt(),
    entryType: {
      type: DataTypes.ENUM(...Object.values(LEDGER_ENTRY_TYPES)),
      allowNull: false,
    },
    metalId: foreignBigInt(),
    quantity: quantity(),
    rate: money({ allowNull: true }),
    amount: money({ allowNull: true }),
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  { ...modelOptions("ledger_entries", { updatedAt: false }) },
);

export default LedgerEntry;
