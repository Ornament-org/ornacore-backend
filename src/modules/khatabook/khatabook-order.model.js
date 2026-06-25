import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions, quantity } from "../../database/models/model.helpers.js";
import { KHATABOOK_ORDER_STATUSES } from "./khatabook.constants.js";

const KhatabookOrder = sequelize.define(
  "KhatabookOrder",
  {
    id: bigIntId,
    orderNumber: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    shopkeeperId: foreignBigInt(),
    metalId: foreignBigInt(),
    entryDate: { type: DataTypes.DATE, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    previousDue: quantity({ defaultValue: "0.000" }),
    fineDelivered: quantity({ defaultValue: "0.000" }),
    creditReceived: quantity({ defaultValue: "0.000" }),
    totalBeforeCollection: quantity({ defaultValue: "0.000" }),
    runningDue: quantity({ defaultValue: "0.000" }),
    outstandingDue: quantity({ defaultValue: "0.000" }),
    creditLimit: quantity({ defaultValue: "0.000" }),
    attemptedDue: quantity({ defaultValue: "0.000" }),
    exceededBy: quantity({ defaultValue: "0.000" }),
    isCreditLimitOverride: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: {
      type: DataTypes.ENUM(...Object.values(KHATABOOK_ORDER_STATUSES)),
      allowNull: false,
      defaultValue: KHATABOOK_ORDER_STATUSES.UNSETTLED,
    },
    createdByUserId: foreignBigInt({ allowNull: true }),
    updatedByUserId: foreignBigInt({ allowNull: true }),
  },
  {
    ...modelOptions("khatabook_orders", {
      indexes: [
        { fields: ["shopkeeper_id", "metal_id", "entry_date"] },
        { fields: ["shopkeeper_id", "status"] },
      ],
    }),
  },
);

export default KhatabookOrder;
