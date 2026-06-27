import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";

const list = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const auditLogController = {
  list,
};
