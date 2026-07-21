import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";

const getOrThrow = async (id) => {
  const placeholder = await db.BannerPlaceholder.findByPk(id);
  if (!placeholder) {
    throw new AppError("Banner placeholder not found", {
      statusCode: 404,
      code: "BANNER_PLACEHOLDER_NOT_FOUND",
    });
  }
  return placeholder;
};

const withUsage = async (placeholders) => {
  const counts = await db.Banner.findAll({
    attributes: ["placementId", [db.Sequelize.fn("COUNT", db.Sequelize.col("id")), "count"]],
    where: { placementId: placeholders.map((row) => row.id) },
    group: ["placementId"],
    raw: true,
  });
  const countByPlacement = new Map(counts.map((row) => [String(row.placementId), Number(row.count)]));
  return placeholders.map((placeholder) => ({
    ...placeholder.toJSON(),
    usedInCount: countByPlacement.get(String(placeholder.id)) ?? 0,
  }));
};

export const bannerPlaceholderService = {
  async list(query = {}) {
    const where = {};
    if (query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query.search}%` } },
        { key: { [Op.like]: `%${query.search}%` } },
      ];
    }
    if (query.status) where.status = query.status;

    const placeholders = await db.BannerPlaceholder.findAll({
      where,
      order: [["name", "ASC"]],
    });
    return withUsage(placeholders);
  },

  // Backs the Banner form's placement dropdown — active placeholders only.
  async listActive() {
    return db.BannerPlaceholder.findAll({
      where: { status: "ACTIVE" },
      order: [["name", "ASC"]],
    });
  },

  async getById(id) {
    return getOrThrow(id);
  },

  async create({ payload, request }) {
    return db.sequelize.transaction(async (transaction) => {
      const existing = await db.BannerPlaceholder.findOne({
        where: { key: payload.key },
        transaction,
      });
      if (existing) {
        throw new AppError(`Placeholder key "${payload.key}" already exists`, {
          statusCode: 409,
          code: "DUPLICATE_RESOURCE",
        });
      }
      const placeholder = await db.BannerPlaceholder.create(
        {
          name: payload.name,
          key: payload.key,
          description: payload.description ?? null,
          status: payload.status ?? "ACTIVE",
          createdByUserId: request.auth.sub,
          updatedByUserId: request.auth.sub,
        },
        { transaction },
      );
      await auditLogService.record({
        request,
        action: "CREATE",
        module: "banners",
        entityType: "BannerPlaceholder",
        entityId: placeholder.id,
        newValue: placeholder,
        transaction,
      });
      return placeholder;
    });
  },

  async update({ id, payload, request }) {
    const placeholder = await getOrThrow(id);
    const oldValue = placeholder.toJSON();

    await db.sequelize.transaction(async (transaction) => {
      await placeholder.update(
        { ...payload, updatedByUserId: request.auth.sub },
        { transaction },
      );
      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "banners",
        entityType: "BannerPlaceholder",
        entityId: placeholder.id,
        oldValue,
        newValue: placeholder,
        transaction,
      });
    });
    return getOrThrow(id);
  },

  async remove({ id, request }) {
    const placeholder = await getOrThrow(id);
    const usedInCount = await db.Banner.count({ where: { placementId: id } });
    if (usedInCount > 0) {
      throw new AppError("This placement is used by one or more banners and cannot be deleted", {
        statusCode: 409,
        code: "BANNER_PLACEHOLDER_IN_USE",
        details: { usedInCount },
      });
    }

    await db.sequelize.transaction(async (transaction) => {
      const oldValue = placeholder.toJSON();
      await placeholder.destroy({ transaction });
      await auditLogService.record({
        request,
        action: "DELETE",
        module: "banners",
        entityType: "BannerPlaceholder",
        entityId: id,
        oldValue,
        transaction,
      });
    });
  },
};
