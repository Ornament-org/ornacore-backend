import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const ProductCategoryMapping = sequelize.define(
  "ProductCategoryMapping",
  {
    id: bigIntId,
    productId: foreignBigInt(),
    categoryId: foreignBigInt(),
    isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    primaryProductId: foreignBigInt({ allowNull: true }),
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  {
    ...modelOptions("product_category_mappings", {
      indexes: [
        { unique: true, fields: ["product_id", "category_id"] },
        { unique: true, fields: ["primary_product_id"] },
        { fields: ["category_id"] },
        { fields: ["product_id", "is_primary"] },
      ],
      hooks: {
        beforeValidate(mapping) {
          mapping.primaryProductId = mapping.isPrimary ? mapping.productId : null;
        },
        beforeBulkCreate(mappings) {
          for (const mapping of mappings) {
            mapping.primaryProductId = mapping.isPrimary ? mapping.productId : null;
          }
        },
      },
    }),
  },
);

export default ProductCategoryMapping;
