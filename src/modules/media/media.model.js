import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const Media = sequelize.define(
  "Media",
  {
    id: bigIntId,
    publicId: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    secureUrl: { type: DataTypes.TEXT, allowNull: false },
    resourceType: { type: DataTypes.STRING(50), allowNull: false },
    folder: { type: DataTypes.STRING(255), allowNull: false },
    originalFilename: { type: DataTypes.STRING(255), allowNull: true },
    mimeType: { type: DataTypes.STRING(120), allowNull: true },
    sizeBytes: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    width: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    height: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    uploadedByUserId: foreignBigInt(),
    ownerType: { type: DataTypes.STRING(100), allowNull: true },
    ownerId: foreignBigInt({ allowNull: true }),
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    ...modelOptions("media", {
      indexes: [{ fields: ["owner_type", "owner_id"] }],
    }),
  },
);

export default Media;
