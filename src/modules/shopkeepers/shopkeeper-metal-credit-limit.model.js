import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions, quantity } from "../../database/models/model.helpers.js";

const ShopkeeperMetalCreditLimit = sequelize.define(
  "ShopkeeperMetalCreditLimit",
  {
    id: bigIntId,
    shopkeeperId: foreignBigInt(),
    metalId: foreignBigInt(),
    creditLimitGrams: quantity({ defaultValue: "0.000" }),
    advanceBalance: quantity({ defaultValue: "0.000" }),
  },
  {
    ...modelOptions("shopkeeper_metal_credit_limits", {
      indexes: [
        { unique: true, fields: ["shopkeeper_id", "metal_id"] },
        { fields: ["metal_id"] },
      ],
    }),
  },
);

export default ShopkeeperMetalCreditLimit;
