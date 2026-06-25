import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const Cart = sequelize.define(
  "Cart",
  {
    id: bigIntId,
    shopkeeperId: foreignBigInt(),
    status: {
      type: DataTypes.ENUM("ACTIVE", "CONVERTED", "ABANDONED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "INR" },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    ...modelOptions("carts", {
      indexes: [{ fields: ["shopkeeper_id", "status"] }],
    }),
  },
);

export default Cart;
