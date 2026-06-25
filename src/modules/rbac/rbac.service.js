import db from "../../database/models/InitializeModels.js";
import { ACTOR_TYPES } from "../../constants/app.constants.js";
import {
  ADMIN_ASSIGNABLE_ROLE_CODES,
  SUPPORTED_ROLE_CODES,
  SYSTEM_ROLE_CODES,
} from "../../constants/rbac.constants.js";
import { AppError } from "../../shared/errors/AppError.js";

const LEGACY_PERMISSION_KEYS = new Set([
  "khatabook.create_order",
  "khatabook.edit_order",
  "khatabook.add_payment",
  "khatabook.credit_limit_override",
]);

const prettify = (value) =>
  String(value)
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const serializeRole = (role) => ({
  id: Number(role.id),
  name: role.code,
  slug: role.code,
  displayName: role.name,
  isSystem: Boolean(role.isSystem),
  isActive: Boolean(role.isActive),
  assignableAccountTypes: [
    ...(ADMIN_ASSIGNABLE_ROLE_CODES.includes(role.code) ? [ACTOR_TYPES.ADMIN] : []),
    ...(role.code === SYSTEM_ROLE_CODES.STAFF ? [ACTOR_TYPES.STAFF] : []),
  ],
});

const serializePermission = (permission) => ({
  id: Number(permission.id),
  module: permission.module,
  permissionKey: permission.code,
  permissionName:
    permission.description && !permission.description.startsWith("Allows ")
      ? permission.description
      : prettify(permission.code.split(".").at(-1)),
});

export const rbacService = {
  async listRoles() {
    const roles = await db.Role.findAll({
      where: { code: SUPPORTED_ROLE_CODES, isActive: true },
      order: [["code", "ASC"]],
    });
    return roles.map(serializeRole);
  },

  async getPermissionMatrix() {
    const [roles, permissions, rolePermissions] = await Promise.all([
      db.Role.findAll({
        where: { code: SUPPORTED_ROLE_CODES, isActive: true },
        order: [["code", "ASC"]],
      }),
      db.Permission.findAll({
        order: [
          ["module", "ASC"],
          ["action", "ASC"],
          ["code", "ASC"],
        ],
      }),
      db.RolePermission.findAll({ attributes: ["roleId", "permissionId"] }),
    ]);

    const allowedPairs = new Set(
      rolePermissions.map((row) => `${Number(row.roleId)}:${Number(row.permissionId)}`),
    );

    return {
      roles: roles.map(serializeRole),
      permissions: permissions
        .filter((permission) => !LEGACY_PERMISSION_KEYS.has(permission.code))
        .map(serializePermission),
      matrix: roles.flatMap((role) =>
        permissions
          .filter((permission) => !LEGACY_PERMISSION_KEYS.has(permission.code))
          .map((permission) => ({
          roleId: Number(role.id),
          permissionId: Number(permission.id),
          allowed:
            role.code === SYSTEM_ROLE_CODES.SUPER_ADMIN ||
            allowedPairs.has(`${Number(role.id)}:${Number(permission.id)}`),
        })),
      ),
    };
  },

  async updateRolePermission({ roleId, permissionId, allowed }) {
    const [role, permission] = await Promise.all([
      db.Role.findByPk(roleId),
      db.Permission.findByPk(permissionId),
    ]);

    if (!role) {
      throw new AppError("Role not found", { statusCode: 404, code: "ROLE_NOT_FOUND" });
    }

    if (!permission) {
      throw new AppError("Permission not found", {
        statusCode: 404,
        code: "PERMISSION_NOT_FOUND",
      });
    }

    if (role.code === SYSTEM_ROLE_CODES.SUPER_ADMIN) {
      return {
        role: serializeRole(role),
        permission: serializePermission(permission),
        allowed: true,
      };
    }

    if (allowed) {
      await db.RolePermission.findOrCreate({
        where: { roleId: role.id, permissionId: permission.id },
        defaults: { roleId: role.id, permissionId: permission.id },
      });
    } else {
      await db.RolePermission.destroy({
        where: { roleId: role.id, permissionId: permission.id },
      });
    }

    return {
      role: serializeRole(role),
      permission: serializePermission(permission),
      allowed: Boolean(allowed),
    };
  },
};
