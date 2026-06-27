import { ACTOR_TYPES } from "../../constants/app.constants.js";
import {
  ADMIN_ASSIGNABLE_ROLE_CODES,
  SUPPORTED_ROLE_CODES,
  SYSTEM_ROLE_CODES,
} from "../../constants/rbac.constants.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";

const list = async (_request, response) => {
  try {
    const roles = await db.Role.findAll({
      where: { code: SUPPORTED_ROLE_CODES, isActive: true },
      include: [
        {
          model: db.Permission,
          as: "permissions",
          through: { attributes: [] },
          required: false,
        },
      ],
      order: [["code", "ASC"]],
    });
    response.json(
      ApiResponse.success({
        data: roles.map((role) => {
          const serialized = role.toJSON();
          return {
            ...serialized,
            assignableAccountTypes: [
              ...(ADMIN_ASSIGNABLE_ROLE_CODES.includes(role.code) ? [ACTOR_TYPES.ADMIN] : []),
              ...(role.code === SYSTEM_ROLE_CODES.STAFF ? [ACTOR_TYPES.STAFF] : []),
            ],
          };
        }),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/roles
  { "name": "Custom Role", "description": "..." }
  NOTE: always returns 409 — custom roles are disabled, system manages supported roles
*/
const create = async (_request, _response) => {
  try {
    throw new AppError("Custom roles are disabled. Supported roles are managed by the system.", {
      statusCode: 409,
      code: "CUSTOM_ROLES_DISABLED",
      details: { supportedRoles: SUPPORTED_ROLE_CODES },
    });
  } catch (error) {
    _response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  PATCH /admin/roles/:id
  { "name": "Salesperson", "description": "Can manage sales", "permissionIds": [1, 2, 5] }
*/
const update = async (request, response) => {
  try {
    const role = await db.Role.findByPk(request.validated.params.id);
    if (!role) {
      throw new AppError("Role not found", { statusCode: 404, code: "ROLE_NOT_FOUND" });
    }
    if (!SUPPORTED_ROLE_CODES.includes(role.code)) {
      throw new AppError("Unsupported roles cannot be managed", {
        statusCode: 409,
        code: "UNSUPPORTED_ROLE",
      });
    }
    const oldValue = role.toJSON();
    const { permissionIds, ...payload } = request.validated.body;
    await db.sequelize.transaction(async (transaction) => {
      await role.update({ ...payload, code: role.code, isSystem: true }, { transaction });
      if (permissionIds) {
        await db.RolePermission.destroy({ where: { roleId: role.id }, transaction });
        if (permissionIds.length) {
          await db.RolePermission.bulkCreate(
            permissionIds.map((permissionId) => ({
              roleId: role.id,
              permissionId,
            })),
            { transaction },
          );
        }
      }
      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "roles",
        entityType: "Role",
        entityId: role.id,
        oldValue,
        newValue: { ...role.toJSON(), permissionIds },
        transaction,
      });
    });
    response.json(
      ApiResponse.success({
        message: "Role updated successfully",
        data: role,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const remove = async (request, _response) => {
  try {
    const role = await db.Role.findByPk(request.validated.params.id);
    if (!role) {
      throw new AppError("Role not found", { statusCode: 404, code: "ROLE_NOT_FOUND" });
    }
    throw new AppError("System roles cannot be deleted", {
      statusCode: 409,
      code: "SYSTEM_ROLE_IMMUTABLE",
    });
  } catch (error) {
    _response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const roleController = {
  list,
  create,
  update,
  remove,
};
