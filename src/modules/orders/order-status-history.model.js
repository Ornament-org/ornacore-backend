import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { ORDER_STATUSES } from "../../constants/app.constants.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const OrderStatusHistory = sequelize.define(
  "OrderStatusHistory",
  {
    id: bigIntId,
    orderId: foreignBigInt(),
    fromStatus: { type: DataTypes.ENUM(...Object.values(ORDER_STATUSES)), allowNull: true },
    toStatus: { type: DataTypes.ENUM(...Object.values(ORDER_STATUSES)), allowNull: false },
    note: { type: DataTypes.STRING(500), allowNull: true },
    changedByUserId: foreignBigInt(),
  },
  { ...modelOptions("order_status_history", { updatedAt: false }) },
);

export default OrderStatusHistory;
