import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, modelOptions } from "../../database/models/model.helpers.js";

const Permission = sequelize.define(
  "Permission",
  {
    id: bigIntId,
    code: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    module: { type: DataTypes.STRING(100), allowNull: false },
    action: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { ...modelOptions("permissions") },
);

export default Permission;
