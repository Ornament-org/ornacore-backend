import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const BannerPlaceholder = sequelize.define(
  "BannerPlaceholder",
  {
    id: bigIntId,
    name: { type: DataTypes.STRING(150), allowNull: false },
    key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(500), allowNull: true },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    createdByUserId: foreignBigInt({ allowNull: true }),
    updatedByUserId: foreignBigInt({ allowNull: true }),
  },
  {
    ...modelOptions("banner_placeholders", {
      indexes: [{ fields: ["status"] }],
    }),
  },
);

export default BannerPlaceholder;
