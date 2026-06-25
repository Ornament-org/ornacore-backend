import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "../../constants/app.constants.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  money,
} from "../../database/models/model.helpers.js";

const Order = sequelize.define(
  "Order",
  {
    id: bigIntId,
    orderNumber: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    shopkeeperId: foreignBigInt(),
    placedByUserId: foreignBigInt(),
    assignedStaffId: foreignBigInt({ allowNull: true }),
    status: {
      type: DataTypes.ENUM(...Object.values(ORDER_STATUSES)),
      allowNull: false,
      defaultValue: ORDER_STATUSES.REQUESTED,
    },
    paymentStatus: {
      type: DataTypes.ENUM(...Object.values(PAYMENT_STATUSES)),
      allowNull: false,
      defaultValue: PAYMENT_STATUSES.UNPAID,
    },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "INR" },
    subtotal: money(),
    discountTotal: money({ defaultValue: "0.0000" }),
    taxTotal: money({ defaultValue: "0.0000" }),
    grandTotal: money(),
    pricingSnapshot: { type: DataTypes.JSON, allowNull: false },
    taxSnapshot: { type: DataTypes.JSON, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    confirmedAt: { type: DataTypes.DATE, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
  },
  { ...modelOptions("orders") },
);

export default Order;
