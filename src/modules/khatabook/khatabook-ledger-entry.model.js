import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions, quantity } from "../../database/models/model.helpers.js";
import { KHATABOOK_LEDGER_ENTRY_TYPES } from "./khatabook.constants.js";

const KhatabookLedgerEntry = sequelize.define(
  "KhatabookLedgerEntry",
  {
    id: bigIntId,
    shopkeeperId: foreignBigInt(),
    metalId: foreignBigInt(),
    khatabookOrderId: foreignBigInt({ allowNull: true }),
    collectionId: foreignBigInt({ allowNull: true }),
    entryDate: { type: DataTypes.DATE, allowNull: false },
    entryType: {
      type: DataTypes.ENUM(...Object.values(KHATABOOK_LEDGER_ENTRY_TYPES)),
      allowNull: false,
    },
    debitFine: quantity({ defaultValue: "0.000" }),
    creditFine: quantity({ defaultValue: "0.000" }),
    runningBalance: quantity({ defaultValue: "0.000" }),
    description: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    ...modelOptions("khatabook_ledger_entries", {
      indexes: [
        { fields: ["shopkeeper_id", "metal_id", "entry_date"] },
        { fields: ["khatabook_order_id"] },
        { fields: ["collection_id"] },
      ],
    }),
  },
);

export default KhatabookLedgerEntry;
