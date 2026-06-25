import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const JournalEntry = sequelize.define(
  "JournalEntry",
  {
    id: bigIntId,
    entryNumber: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    entryDate: { type: DataTypes.DATE, allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: false },
    sourceType: { type: DataTypes.STRING(100), allowNull: false },
    sourceId: foreignBigInt({ allowNull: true }),
    status: {
      type: DataTypes.ENUM("DRAFT", "POSTED", "REVERSED"),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    reversalOfEntryId: foreignBigInt({ allowNull: true }),
    postedByUserId: foreignBigInt({ allowNull: true }),
    postedAt: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    ...modelOptions("journal_entries", {
      indexes: [{ fields: ["source_type", "source_id"] }],
    }),
  },
);

export default JournalEntry;
