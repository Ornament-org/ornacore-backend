import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const ProductImage = sequelize.define(
  "ProductImage",
  {
    id: bigIntId,
    productId: foreignBigInt(),
    productVariantId: foreignBigInt({ allowNull: true }),
    mediaId: foreignBigInt(),
    altText: { type: DataTypes.STRING(255), allowNull: true },
    isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    displayOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  {
    ...modelOptions("product_images", {
      indexes: [{ unique: true, fields: ["product_id", "media_id"] }],
    }),
  },
);

export default ProductImage;
