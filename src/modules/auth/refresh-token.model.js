import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    id: bigIntId,
    userId: foreignBigInt(),
    tokenHash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    tokenFamily: { type: DataTypes.UUID, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    replacedByTokenId: foreignBigInt({ allowNull: true }),
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    userAgent: { type: DataTypes.STRING(500), allowNull: true },
  },
  { ...modelOptions("refresh_tokens") },
);

export default RefreshToken;
