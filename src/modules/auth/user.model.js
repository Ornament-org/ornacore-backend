import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { ACTOR_TYPES, USER_STATUSES } from "../../constants/app.constants.js";
import { bigIntId, modelOptions } from "../../database/models/model.helpers.js";

const User = sequelize.define(
  "User",
  {
    id: bigIntId,
    email: { type: DataTypes.STRING(191), allowNull: true, unique: true },
    mobile: { type: DataTypes.STRING(32), allowNull: true, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: true },
    mustChangePassword: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    actorType: { type: DataTypes.ENUM(...Object.values(ACTOR_TYPES)), allowNull: false },
    status: {
      type: DataTypes.ENUM(...Object.values(USER_STATUSES)),
      allowNull: false,
      defaultValue: USER_STATUSES.ACTIVE,
    },
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    mobileVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    ...modelOptions("users", {
      defaultScope: { attributes: { exclude: ["passwordHash"] } },
      scopes: { withPassword: { attributes: { include: ["passwordHash"] } } },
    }),
  },
);

export default User;
