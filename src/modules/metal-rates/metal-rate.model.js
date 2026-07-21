import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const MetalRate = sequelize.define(
  "MetalRate",
  {
    id: bigIntId,
    metalId: foreignBigInt(),
    rateDate: { type: DataTypes.DATEONLY, allowNull: false },
    basePricePerGram: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    extraPerGram: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    createdByUserId: foreignBigInt({ allowNull: true }),
    sourceName: { type: DataTypes.STRING(100), allowNull: true },
    sourceLocation: { type: DataTypes.STRING(100), allowNull: true },
    sourceUrl: { type: DataTypes.STRING(500), allowNull: true },
    sourceSyncedAt: { type: DataTypes.DATE, allowNull: true },
    sourceRawUpdate: { type: DataTypes.STRING(200), allowNull: true },
  },
  {
    ...modelOptions("metal_rates", {
      indexes: [{ unique: true, fields: ["metal_id", "rate_date"] }],
    }),
  },
);

export default MetalRate;
