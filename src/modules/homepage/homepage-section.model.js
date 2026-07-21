import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const HomepageSection = sequelize.define(
  "HomepageSection",
  {
    id: bigIntId,
    homepageId: foreignBigInt(),
    sectionType: { type: DataTypes.STRING(50), allowNull: false },
    sectionKey: { type: DataTypes.STRING(100), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: true },
    subtitle: { type: DataTypes.STRING(300), allowNull: true },
    configJson: { type: DataTypes.JSON, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    ...modelOptions("homepage_sections", {
      indexes: [{ unique: true, fields: ["homepage_id", "section_key"] }],
    }),
  },
);

export default HomepageSection;
