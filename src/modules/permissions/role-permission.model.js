import { sequelize } from "../../config/database.js";
import { foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const RolePermission = sequelize.define(
  "RolePermission",
  {
    roleId: { ...foreignBigInt(), primaryKey: true },
    permissionId: { ...foreignBigInt(), primaryKey: true },
  },
  { ...modelOptions("role_permissions") },
);

export default RolePermission;
