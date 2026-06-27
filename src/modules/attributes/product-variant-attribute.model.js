import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const ProductVariantAttribute = sequelize.define(
  "ProductVariantAttribute",
  {
    variantId: { ...foreignBigInt(), primaryKey: true },
    attributeValueId: { ...foreignBigInt(), primaryKey: true },
  },
  {
    ...modelOptions("product_variant_attributes", { timestamps: false }),
    indexes: [{ fields: ["attribute_value_id"], name: "idx_pva_attr_value" }],
  },
);

export default ProductVariantAttribute;
