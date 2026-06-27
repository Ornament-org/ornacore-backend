import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, modelOptions } from "../../database/models/model.helpers.js";

const FeatureFlag = sequelize.define(
  "FeatureFlag",
  {
    id: bigIntId,
    key: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    module: { type: DataTypes.STRING(100), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    isEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    environment: {
      type: DataTypes.ENUM("all", "web", "mobile", "server"),
      allowNull: false,
      defaultValue: "all",
    },
    targetAudience: {
      type: DataTypes.ENUM("all", "admin", "shopkeeper"),
      allowNull: false,
      defaultValue: "all",
    },
    rolloutPercentage: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 100,
    },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    ...modelOptions("feature_flags", {
      indexes: [
        { fields: ["environment"] },
        { fields: ["is_enabled"] },
      ],
    }),
  },
);

export default FeatureFlag;
