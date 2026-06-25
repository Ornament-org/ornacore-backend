import { sequelize } from "../../config/database.js";
import { foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const UserRole = sequelize.define(
  "UserRole",
  {
    userId: { 
      ...foreignBigInt(), 
      primaryKey: true 
    },
    roleId: { 
      ...foreignBigInt(), 
      primaryKey: true
     },
    assignedByUserId: foreignBigInt({ allowNull: true }),
  },
  { ...modelOptions("user_roles") },
);

export default UserRole;
