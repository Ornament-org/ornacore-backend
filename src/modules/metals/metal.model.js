import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, modelOptions } from "../../database/models/model.helpers.js";

const Metal = sequelize.define(
  "Metal",
  {
    id: bigIntId,
    code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    displayOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  { ...modelOptions("metals") },
);

export default Metal;
