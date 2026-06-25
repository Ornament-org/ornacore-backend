import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { PAYMENT_METHODS, PAYMENT_TRANSACTION_STATUSES } from "../../constants/app.constants.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  money,
} from "../../database/models/model.helpers.js";

const Payment = sequelize.define(
  "Payment",
  {
    id: bigIntId,
    paymentNumber: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    orderId: foreignBigInt({ allowNull: true }),
    shopkeeperId: foreignBigInt(),
    method: { type: DataTypes.ENUM(...Object.values(PAYMENT_METHODS)), allowNull: false },
    status: {
      type: DataTypes.ENUM(...Object.values(PAYMENT_TRANSACTION_STATUSES)),
      allowNull: false,
    },
    amount: money(),
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "INR" },
    externalReference: { type: DataTypes.STRING(191), allowNull: true },
    receivedAt: { type: DataTypes.DATE, allowNull: true },
    recordedByUserId: foreignBigInt(),
    notes: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  { ...modelOptions("payments") },
);

export default Payment;
