import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  money,
  quantity,
} from "../../database/models/model.helpers.js";
import { KHATABOOK_ADJUSTMENT_TYPES } from "./khatabook.constants.js";

const KhatabookAdjustment = sequelize.define(
  "KhatabookAdjustment",
  {
    id: bigIntId,
    shopkeeperId: foreignBigInt(),
    metalId: foreignBigInt(),
    adjustmentType: {
      type: DataTypes.ENUM(...Object.values(KHATABOOK_ADJUSTMENT_TYPES)),
      allowNull: false,
    },
    dueQuantity: quantity({ defaultValue: "0.000" }),
    cashAmount: money({ defaultValue: "0.0000" }),
    adjustmentDate: { type: DataTypes.DATE, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdByUserId: foreignBigInt({ allowNull: true }),
  },
  {
    ...modelOptions("khatabook_adjustments", {
      indexes: [
        { fields: ["shopkeeper_id", "metal_id", "adjustment_date"] },
        { fields: ["adjustment_type"] },
      ],
    }),
  },
);

export default KhatabookAdjustment;
