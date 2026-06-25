import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  money,
} from "../../database/models/model.helpers.js";

const PricingRule = sequelize.define(
  "PricingRule",
  {
    id: bigIntId,
    productId: foreignBigInt({ allowNull: true }),
    productVariantId: foreignBigInt({ allowNull: true }),
    priceGroupId: foreignBigInt({ allowNull: true }),
    ruleType: {
      type: DataTypes.ENUM(
        "FIXED",
        "METAL_RATE_BASED",
        "PERCENTAGE_MARGIN",
        "PERCENTAGE_DISCOUNT",
        "BULK",
      ),
      allowNull: false,
    },
    basePrice: money({ allowNull: true }),
    makingCharge: money({ allowNull: true }),
    percentageValue: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
    minimumQuantity: { type: DataTypes.DECIMAL(14, 3), allowNull: true },
    configuration: { type: DataTypes.JSON, allowNull: true },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    startsAt: { type: DataTypes.DATE, allowNull: true },
    endsAt: { type: DataTypes.DATE, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { ...modelOptions("pricing_rules") },
);

export default PricingRule;
