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
    folderId: foreignBigInt({ allowNull: true }),
    altText: { type: DataTypes.STRING(300), allowNull: true },
  },
  {
    ...modelOptions("media", {
      // Trash/restore in the Media Library is a soft delete — Sequelize's paranoid mode
      // sets/clears deleted_at and excludes trashed rows from normal queries by default,
      // while findByPk(..., { paranoid: false }) still reaches them for restore/purge.
      // This never breaks the mediaId FKs that Category/ProductImage hold onto.
      paranoid: true,
      indexes: [{ fields: ["owner_type", "owner_id"] }, { fields: ["folder_id"] }],
    }),
  },
);

export default Media;
