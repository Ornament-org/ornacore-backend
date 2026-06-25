import { Op } from "sequelize";
import { PERMISSIONS } from "../../constants/permissions.js";
import db from "../../database/models/InitializeModels.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { listQuerySchema } from "../../shared/http/crud.validation.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { createModuleRouter } from "../module.router.js";

export const auditLogAdminRouter = createModuleRouter();

auditLogAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.AUDIT_VIEW),
  validate(listQuerySchema),
  asyncHandler(async (request, response) => {
    const { page, pageSize, search, module, action, actorUserId } = request.validated.query;
    const where = {};
    if (module) where.module = module;
    if (action) where.action = action;
    if (actorUserId) where.actorUserId = actorUserId;
    if (search) {
      where[Op.or] = [
        { action: { [Op.like]: `%${search}%` } },
        { module: { [Op.like]: `%${search}%` } },
        { entityType: { [Op.like]: `%${search}%` } },
      ];
    }
    const { rows, count } = await db.AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: "actor",
          attributes: ["id", "email", "mobile", "actorType"],
          required: false,
          include: [
            {
              model: db.Role,
              as: "roles",
              attributes: ["code", "name"],
              through: { attributes: [] },
              required: false,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
    });
    response.json(
      ApiResponse.success({
        data: rows,
        meta: {
          page,
          pageSize,
          totalItems: count,
          totalPages: Math.ceil(count / pageSize),
        },
      }),
    );
  }),
);
