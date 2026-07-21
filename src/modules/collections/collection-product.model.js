import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const CollectionProduct = sequelize.define(
  "CollectionProduct",
  {
    id: bigIntId,
    collectionId: foreignBigInt({ allowNull: false }),
    productId: foreignBigInt({ allowNull: false }),
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  {
    ...modelOptions("collection_products", {
      indexes: [
        { fields: ["collection_id", "product_id"], unique: true },
        { fields: ["sort_order"] },
      ],
    }),
  },
);

export default CollectionProduct;
