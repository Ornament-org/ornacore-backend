import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const CollectionCategory = sequelize.define(
  "CollectionCategory",
  {
    id: bigIntId,
    collectionId: foreignBigInt({ allowNull: false }),
    categoryId: foreignBigInt({ allowNull: false }),
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  {
    ...modelOptions("collection_categories", {
      indexes: [
        { fields: ["collection_id", "category_id"], unique: true },
        { fields: ["sort_order"] },
      ],
    }),
  },
);

export default CollectionCategory;
