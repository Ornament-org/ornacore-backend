import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const Delivery = sequelize.define(
  "Delivery",
  {
    id: bigIntId,
    orderId: { ...foreignBigInt(), unique: true },
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "READY",
        "DISPATCHED",
        "IN_TRANSIT",
        "DELIVERED",
        "FAILED",
        "RETURNED",
      ),
      allowNull: false,
      defaultValue: "PENDING",
    },
    courierName: { type: DataTypes.STRING(150), allowNull: true },
    trackingNumber: { type: DataTypes.STRING(191), allowNull: true },
    trackingUrl: { type: DataTypes.TEXT, allowNull: true },
    dispatchedAt: { type: DataTypes.DATE, allowNull: true },
    estimatedDeliveryAt: { type: DataTypes.DATE, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    proofMediaId: foreignBigInt({ allowNull: true }),
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { ...modelOptions("deliveries") },
);

export default Delivery;
