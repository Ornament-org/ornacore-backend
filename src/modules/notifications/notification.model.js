import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const Notification = sequelize.define(
  "Notification",
  {
    id: bigIntId,
    userId: foreignBigInt(),
    eventType: { type: DataTypes.STRING(120), allowNull: false },
    channel: {
      type: DataTypes.ENUM("IN_APP", "EMAIL", "SMS", "PUSH", "WHATSAPP"),
      allowNull: false,
    },
    title: { type: DataTypes.STRING(191), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: true },
    status: {
      type: DataTypes.ENUM("PENDING", "SENT", "FAILED", "READ"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    readAt: { type: DataTypes.DATE, allowNull: true },
    failureReason: { type: DataTypes.TEXT, allowNull: true },
  },
  { ...modelOptions("notifications") },
);

export default Notification;
