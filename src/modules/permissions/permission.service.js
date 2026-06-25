import db from "../../database/models/InitializeModels.js";

const LEGACY_PERMISSION_KEYS = new Set([
  "khatabook.create_order",
  "khatabook.edit_order",
  "khatabook.add_payment",
  "khatabook.credit_limit_override",
]);

export const permissionService = {
  async list() {
    const permissions = await db.Permission.findAll({
      order: [
        ["module", "ASC"],
        ["action", "ASC"],
      ],
    });
    return permissions.filter((permission) => !LEGACY_PERMISSION_KEYS.has(permission.code));
  },
};
