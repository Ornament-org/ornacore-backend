import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, modelOptions } from "../../database/models/model.helpers.js";

const Role = sequelize.define(
  "Role",
  {
    id: bigIntId,
    code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { ...modelOptions("roles") },
);

export default Role;
