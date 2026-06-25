import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: bigIntId,
    actorUserId: foreignBigInt({ allowNull: true }),
    action: { type: DataTypes.STRING(150), allowNull: false },
    module: { type: DataTypes.STRING(100), allowNull: false },
    entityType: { type: DataTypes.STRING(100), allowNull: true },
    entityId: foreignBigInt({ allowNull: true }),
    oldValue: { type: DataTypes.JSON, allowNull: true },
    newValue: { type: DataTypes.JSON, allowNull: true },
    requestId: { type: DataTypes.STRING(64), allowNull: true },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    userAgent: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    ...modelOptions("audit_logs", {
      updatedAt: false,
      indexes: [
        { fields: ["module", "action", "created_at"] },
        { fields: ["entity_type", "entity_id"] },
      ],
    }),
  },
);

export default AuditLog;
