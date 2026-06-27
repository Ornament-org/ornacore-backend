import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const FeatureFlagAudit = sequelize.define(
  "FeatureFlagAudit",
  {
    id: bigIntId,
    featureFlagId: foreignBigInt({ allowNull: false }),
    actorUserId: foreignBigInt({ allowNull: true }),
    action: { type: DataTypes.STRING(50), allowNull: false },
    oldValue: { type: DataTypes.JSON, allowNull: true },
    newValue: { type: DataTypes.JSON, allowNull: true },
  },
  {
    ...modelOptions("feature_flag_audits", {
      updatedAt: false,
      indexes: [{ fields: ["feature_flag_id", "created_at"] }],
    }),
  },
);

export default FeatureFlagAudit;
