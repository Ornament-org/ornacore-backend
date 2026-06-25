import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { LEDGER_ENTRY_SIDES } from "../../constants/app.constants.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  money,
} from "../../database/models/model.helpers.js";

const JournalLine = sequelize.define(
  "JournalLine",
  {
    id: bigIntId,
    journalEntryId: foreignBigInt(),
    ledgerAccountId: foreignBigInt(),
    side: { type: DataTypes.ENUM(...Object.values(LEDGER_ENTRY_SIDES)), allowNull: false },
    amount: money(),
    memo: { type: DataTypes.STRING(500), allowNull: true },
  },
  { ...modelOptions("journal_lines", { updatedAt: false }) },
);

export default JournalLine;
