import { sequelize } from "../../config/database.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  quantity,
} from "../../database/models/model.helpers.js";

const Inventory = sequelize.define(
  "Inventory",
  {
    id: bigIntId,
    productVariantId: { ...foreignBigInt(), unique: true },
    onHandQuantity: quantity({ defaultValue: "0.000" }),
    reservedQuantity: quantity({ defaultValue: "0.000" }),
    damagedQuantity: quantity({ defaultValue: "0.000" }),
    reorderLevel: quantity({ defaultValue: "0.000" }),
  },
  { ...modelOptions("inventories") },
);

export default Inventory;
