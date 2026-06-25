import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const OtpChallenge = sequelize.define(
  "OtpChallenge",
  {
    id: bigIntId,
    userId: foreignBigInt({ allowNull: true }),
    purpose: {
      type: DataTypes.ENUM("REGISTRATION", "LOGIN", "PASSWORD_RESET", "CONTACT_VERIFICATION"),
      allowNull: false,
    },
    channel: { type: DataTypes.ENUM("EMAIL", "SMS"), allowNull: false },
    destination: { type: DataTypes.STRING(191), allowNull: false },
    codeHash: { type: DataTypes.STRING(255), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    ...modelOptions("otp_challenges", {
      indexes: [{ fields: ["destination", "purpose", "created_at"] }],
    }),
  },
);

export default OtpChallenge;
