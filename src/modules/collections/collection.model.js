import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const Collection = sequelize.define(
  "Collection",
  {
    id: bigIntId,
    name: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    shortDescription: { type: DataTypes.STRING(500), allowNull: true },
    mediaId: foreignBigInt({ allowNull: true }),
    metalId: foreignBigInt({ allowNull: true }),
    type: {
      type: DataTypes.ENUM("CATEGORY", "PRODUCT"),
      allowNull: false,
      defaultValue: "PRODUCT",
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    isDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdByUserId: foreignBigInt({ allowNull: true }),
    updatedByUserId: foreignBigInt({ allowNull: true }),
  },
  {
    ...modelOptions("collections", {
      defaultScope: { where: { isDeleted: false } },
      scopes: { withDeleted: {} },
      indexes: [
        { fields: ["status"] },
        { fields: ["is_deleted"] },
        { fields: ["sort_order"] },
        { fields: ["metal_id"] },
      ],
    }),
  },
);

export default Collection;
