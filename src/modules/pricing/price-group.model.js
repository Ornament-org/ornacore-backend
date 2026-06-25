import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, modelOptions } from "../../database/models/model.helpers.js";

const PriceGroup = sequelize.define(
  "PriceGroup",
  {
    id: bigIntId,
    code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { ...modelOptions("price_groups") },
);

export default PriceGroup;
