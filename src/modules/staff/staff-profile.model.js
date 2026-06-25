import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const StaffProfile = sequelize.define(
  "StaffProfile",
  {
    id: bigIntId,
    userId: { ...foreignBigInt(), unique: true },
    employeeCode: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    fullName: { type: DataTypes.STRING(191), allowNull: false },
    designation: { type: DataTypes.STRING(120), allowNull: true },
    joinedAt: { type: DataTypes.DATEONLY, allowNull: true },
  },
  { ...modelOptions("staff_profiles") },
);

export default StaffProfile;
