import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions, quantity } from "../../database/models/model.helpers.js";

const KhatabookOrderItem = sequelize.define(
  "KhatabookOrderItem",
  {
    id: bigIntId,
    khatabookOrderId: foreignBigInt(),
    itemName: { type: DataTypes.STRING(191), allowNull: false },
    grossWeight: quantity(),
    tunch: { type: DataTypes.DECIMAL(8, 3), allowNull: false },
    fineWeight: quantity(),
  },
  {
    ...modelOptions("khatabook_order_items", {
      indexes: [{ fields: ["khatabook_order_id"] }],
    }),
  },
);

export default KhatabookOrderItem;
