import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const AttributeValue = sequelize.define(
  "AttributeValue",
  {
    id: bigIntId,
    attributeId: foreignBigInt(),
    value: { type: DataTypes.STRING(200), allowNull: false },
    displayOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  {
    ...modelOptions("attribute_values", {
      indexes: [
        { unique: true, fields: ["attribute_id", "value"] },
        { fields: ["attribute_id", "display_order"] },
      ],
    }),
  },
);

export default AttributeValue;
