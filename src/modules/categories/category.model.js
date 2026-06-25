import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { CATEGORY_STATUSES } from "../../constants/app.constants.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const Category = sequelize.define(
  "Category",
  {
    id: bigIntId,
    parentId: foreignBigInt({ allowNull: true }),
    metalId: foreignBigInt({ allowNull: true }),
    name: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    shortDescription: { type: DataTypes.STRING(500), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    mediaId: foreignBigInt({ allowNull: true }),
    status: {
      type: DataTypes.ENUM(...Object.values(CATEGORY_STATUSES)),
      allowNull: false,
      defaultValue: CATEGORY_STATUSES.ACTIVE,
    },
    metaTitle: { type: DataTypes.STRING(180), allowNull: true },
    metaDescription: { type: DataTypes.TEXT, allowNull: true },
    ogMediaId: foreignBigInt({ allowNull: true }),
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    isDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdByUserId: foreignBigInt({ allowNull: true }),
    updatedByUserId: foreignBigInt({ allowNull: true }),
  },
  {
    ...modelOptions("categories", {
      defaultScope: { where: { isDeleted: false } },
      scopes: { withDeleted: {} },
      indexes: [
        { fields: ["parent_id"] },
        { fields: ["metal_id"] },
        { fields: ["status"] },
        { fields: ["is_deleted"] },
        { fields: ["sort_order"] },
      ],
    }),
  },
);

export default Category;
