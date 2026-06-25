import db from "../../database/models/InitializeModels.js";

const serialize = (value) => {
  if (!value) return null;
  const plain = typeof value.toJSON === "function" ? value.toJSON() : value;
  if (plain.passwordHash) delete plain.passwordHash;
  if (plain.tokenHash) delete plain.tokenHash;
  if (plain.codeHash) delete plain.codeHash;
  return plain;
};

export const auditLogService = {
  record({ request, action, module, entityType, entityId, oldValue, newValue, transaction }) {
    return db.AuditLog.create(
      {
        actorUserId: request?.auth?.sub ?? null,
        action,
        module,
        entityType,
        entityId: entityId ?? null,
        oldValue: serialize(oldValue),
        newValue: serialize(newValue),
        requestId: request?.id ?? null,
        ipAddress: request?.ip ?? null,
        userAgent: request?.get?.("user-agent")?.slice(0, 500) ?? null,
      },
      { transaction },
    );
  },
};
