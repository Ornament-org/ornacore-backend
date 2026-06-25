import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  quantity,
} from "../../database/models/model.helpers.js";

const InventoryMovement = sequelize.define(
  "InventoryMovement",
  {
    id: bigIntId,
    inventoryId: foreignBigInt(),
    movementType: {
      type: DataTypes.ENUM(
        "STOCK_IN",
        "STOCK_OUT",
        "ADJUSTMENT",
        "RESERVATION",
        "RESERVATION_RELEASE",
        "DAMAGED",
        "RETURNED",
      ),
      allowNull: false,
    },
    quantity: quantity(),
    balanceAfter: quantity(),
    referenceType: { type: DataTypes.STRING(100), allowNull: true },
    referenceId: foreignBigInt({ allowNull: true }),
    reason: { type: DataTypes.STRING(500), allowNull: true },
    createdByUserId: foreignBigInt(),
  },
  {
    ...modelOptions("inventory_movements", {
      updatedAt: false,
      indexes: [{ fields: ["reference_type", "reference_id"] }],
    }),
  },
);

export default InventoryMovement;
