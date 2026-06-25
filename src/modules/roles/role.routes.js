import { z } from "zod";
import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import {
  ADMIN_ASSIGNABLE_ROLE_CODES,
  SUPPORTED_ROLE_CODES,
  SYSTEM_ROLE_CODES,
} from "../../constants/rbac.constants.js";
import db from "../../database/models/InitializeModels.js";
import { validate } from "../../middlewares/validate.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { AppError } from "../../shared/errors/AppError.js";
import { idParamSchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";

export const roleAdminRouter = createModuleRouter();

const roleBody = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  permissionIds: z.array(z.coerce.number().int().positive()).default([]),
});

const createSchema = z.object({
  body: roleBody,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const updateSchema = z.object({
  body: roleBody.partial(),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

roleAdminRouter.use(...protectAdmin(PERMISSIONS.ROLE_MANAGE));

roleAdminRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
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
  }),
);

roleAdminRouter.post(
  "/",
  validate(createSchema),
  asyncHandler(async (_request, _response) => {
    throw new AppError("Custom roles are disabled. Supported roles are managed by the system.", {
      statusCode: 409,
      code: "CUSTOM_ROLES_DISABLED",
      details: { supportedRoles: SUPPORTED_ROLE_CODES },
    });
  }),
);

roleAdminRouter.patch(
  "/:id",
  validate(updateSchema),
  asyncHandler(async (request, response) => {
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
  }),
);

roleAdminRouter.delete(
  "/:id",
  validate(idParamSchema),
  asyncHandler(async (request, _response) => {
    const role = await db.Role.findByPk(request.validated.params.id);
    if (!role) {
      throw new AppError("Role not found", { statusCode: 404, code: "ROLE_NOT_FOUND" });
    }
    throw new AppError("System roles cannot be deleted", {
      statusCode: 409,
      code: "SYSTEM_ROLE_IMMUTABLE",
    });
  }),
);
