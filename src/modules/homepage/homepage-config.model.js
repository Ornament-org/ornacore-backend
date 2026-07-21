import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const HomepageConfig = sequelize.define(
  "HomepageConfig",
  {
    id: bigIntId,
    homepageKey: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    audienceType: {
      type: DataTypes.ENUM("B2B", "B2C", "GLOBAL"),
      allowNull: false,
    },
    metalId: foreignBigInt({ allowNull: true }),
    title: { type: DataTypes.STRING(200), allowNull: false },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Sections save live — no draft/publish workflow. status just controls whether this
    // config is eligible to be resolved for its audience/metal at all.
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    updatedByUserId: foreignBigInt({ allowNull: true }),
  },
  {
    ...modelOptions("homepage_configs"),
  },
);

export default HomepageConfig;
