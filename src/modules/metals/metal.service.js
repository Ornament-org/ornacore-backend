import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";

const metalFields = ["code", "name", "description", "isActive", "displayOrder"];

const filterMetalPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload ?? {}).filter(
      ([key, value]) => metalFields.includes(key) && value !== undefined,
    ),
  );

const getMetalOrThrow = async (id, options = {}) => {
  const metal = await db.Metal.findByPk(id, options);
  if (!metal) {
    throw new AppError("Metal not found", {
      statusCode: 404,
      code: "RESOURCE_NOT_FOUND",
    });
  }
  return metal;
};

export const metalService = {
  async list({ page, pageSize, search, sortBy, sortDirection, isActive }) {
    const where = {};
    if (search) {
      where[Op.or] = [
        { code: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
      ];
    }
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;

    const sortableFields = new Set(["name", "code", "displayOrder", "createdAt"]);
    const order =
      sortBy && sortableFields.has(sortBy)
        ? [[sortBy, String(sortDirection).toUpperCase()]]
        : [
            ["displayOrder", "ASC"],
            ["name", "ASC"],
          ];

    const { rows, count } = await db.Metal.findAndCountAll({
      where,
      order,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
    });

    return {
      rows,
      meta: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  },

  async listActive() {
    return db.Metal.findAll({
      where: { isActive: true },
      order: [
        ["displayOrder", "ASC"],
        ["name", "ASC"],
      ],
    });
  },

  async getById(id) {
    return getMetalOrThrow(id);
  },

  async create({ payload, request }) {
    const metalPayload = filterMetalPayload(payload);
    return db.sequelize.transaction(async (transaction) => {
      const metal = await db.Metal.create(metalPayload, { transaction });
      await auditLogService.record({
        request,
        action: "CREATE",
        module: "metals",
        entityType: "Metal",
        entityId: metal.id,
        newValue: metal,
        transaction,
      });
      return metal;
    });
  },

  async update({ id, payload, request }) {
    const metal = await getMetalOrThrow(id);
    const oldValue = metal.toJSON();
    const metalPayload = filterMetalPayload(payload);

    await db.sequelize.transaction(async (transaction) => {
      await metal.update(metalPayload, { transaction });
      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "metals",
        entityType: "Metal",
        entityId: metal.id,
        oldValue,
        newValue: metal,
        transaction,
      });
    });

    return metal;
  },

  async remove({ id, request }) {
    const metal = await getMetalOrThrow(id);
    const oldValue = metal.toJSON();

    await db.sequelize.transaction(async (transaction) => {
      await metal.destroy({ transaction });
      await auditLogService.record({
        request,
        action: "DELETE",
        module: "metals",
        entityType: "Metal",
        entityId: oldValue.id,
        oldValue,
        transaction,
      });
    });
  },
};
