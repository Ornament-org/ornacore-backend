import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";

const bannerInclude = [
  { model: db.BannerPlaceholder, as: "placement", required: false },
  { model: db.Metal, as: "metal", required: false },
  { model: db.Media, as: "image", required: false },
  { model: db.Media, as: "mobileImage", required: false },
];

const assertMediaExists = async (mediaId, transaction) => {
  if (!mediaId) return;
  const exists = await db.Media.count({ where: { id: mediaId }, transaction });
  if (!exists) {
    throw new AppError("Selected banner image does not exist", {
      statusCode: 422,
      code: "BANNER_MEDIA_NOT_FOUND",
      details: { mediaId },
    });
  }
};

const assertPlacementExists = async (placementId, transaction) => {
  const exists = await db.BannerPlaceholder.count({ where: { id: placementId }, transaction });
  if (!exists) {
    throw new AppError("Selected banner placement does not exist", {
      statusCode: 422,
      code: "BANNER_PLACEMENT_NOT_FOUND",
      details: { placementId },
    });
  }
};

const assertMetalExists = async (metalId, transaction) => {
  if (!metalId) return;
  const exists = await db.Metal.count({ where: { id: metalId }, transaction });
  if (!exists) {
    throw new AppError("Selected metal does not exist", {
      statusCode: 422,
      code: "BANNER_METAL_NOT_FOUND",
      details: { field: "metalId", metalId },
    });
  }
};

const getOrThrow = async (id) => {
  const banner = await db.Banner.findByPk(id, { include: bannerInclude });
  if (!banner) {
    throw new AppError("Banner not found", { statusCode: 404, code: "BANNER_NOT_FOUND" });
  }
  return banner;
};

export const bannerService = {
  async list(query = {}) {
    const where = {};
    if (query.search) {
      where.title = { [Op.like]: `%${query.search}%` };
    }
    if (query.status) where.status = query.status;
    if (query.placementId) where.placementId = query.placementId;
    // A metal filter also surfaces "All Metals" banners alongside it — they're
    // eligible on every metal tab, so hiding them while browsing a specific
    // metal would make them impossible to find/manage from that view.
    if (query.metalId) where[Op.or] = [{ metalId: query.metalId }, { metalId: null }];

    const { rows, count } = await db.Banner.findAndCountAll({
      where,
      include: bannerInclude,
      order: [["sortOrder", "ASC"], ["createdAt", "DESC"]],
      limit: query.pageSize ?? 20,
      offset: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
      distinct: true,
    });

    return {
      rows,
      meta: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        totalItems: count,
        totalPages: Math.ceil(count / (query.pageSize ?? 20)),
      },
    };
  },

  // Fully unauthenticated — storefront rotating banners for a named placement,
  // filtered to ACTIVE banners currently inside their schedule window (if any).
  async listByPlacementKey(placementKey) {
    const placement = await db.BannerPlaceholder.findOne({
      where: { key: placementKey, status: "ACTIVE" },
    });
    if (!placement) return [];

    const now = new Date();
    return db.Banner.findAll({
      where: {
        placementId: placement.id,
        status: "ACTIVE",
        [Op.and]: [
          { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
          { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] },
        ],
      },
      include: [
        { model: db.Media, as: "image", required: false },
        { model: db.Media, as: "mobileImage", required: false },
      ],
      order: [["sortOrder", "ASC"]],
    });
  },

  // Fully unauthenticated — homepage-curated banners: an explicit, ordered
  // set of banner ids (from Homepage Management's Banners section), narrowed
  // to ACTIVE + in-schedule + matching the current metal (or metal-agnostic
  // "All Metals" banners).
  async listActive({ metalId, ids } = {}) {
    const now = new Date();
    const rows = await db.Banner.findAll({
      where: {
        status: "ACTIVE",
        ...(ids?.length ? { id: ids } : {}),
        ...(metalId ? { [Op.or]: [{ metalId }, { metalId: null }] } : {}),
        [Op.and]: [
          { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
          { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] },
        ],
      },
      include: [
        { model: db.Media, as: "image", required: false },
        { model: db.Media, as: "mobileImage", required: false },
      ],
      order: [["sortOrder", "ASC"]],
    });
    if (!ids?.length) return rows;
    const byId = new Map(rows.map((row) => [String(row.id), row]));
    return ids.map((id) => byId.get(String(id))).filter(Boolean);
  },

  async getById(id) {
    return getOrThrow(id);
  },

  async create({ payload, request }) {
    return db.sequelize.transaction(async (transaction) => {
      await assertPlacementExists(payload.placementId, transaction);
      await assertMetalExists(payload.metalId, transaction);
      await assertMediaExists(payload.imageId, transaction);
      await assertMediaExists(payload.mobileImageId, transaction);

      const banner = await db.Banner.create(
        {
          title: payload.title,
          subtitle: payload.subtitle ?? null,
          placementId: payload.placementId,
          metalId: payload.metalId ?? null,
          imageId: payload.imageId,
          mobileImageId: payload.mobileImageId ?? null,
          linkUrl: payload.linkUrl ?? null,
          sortOrder: payload.sortOrder ?? 0,
          status: payload.status ?? "ACTIVE",
          startsAt: payload.startsAt ?? null,
          endsAt: payload.endsAt ?? null,
          createdByUserId: request.auth.sub,
          updatedByUserId: request.auth.sub,
        },
        { transaction },
      );
      await auditLogService.record({
        request,
        action: "CREATE",
        module: "banners",
        entityType: "Banner",
        entityId: banner.id,
        newValue: banner,
        transaction,
      });
      await banner.reload({ include: bannerInclude, transaction });
      return banner;
    });
  },

  async update({ id, payload, request }) {
    const banner = await getOrThrow(id);
    const oldValue = banner.toJSON();

    await db.sequelize.transaction(async (transaction) => {
      if (payload.placementId !== undefined) await assertPlacementExists(payload.placementId, transaction);
      if (payload.metalId !== undefined) await assertMetalExists(payload.metalId, transaction);
      if (payload.imageId !== undefined) await assertMediaExists(payload.imageId, transaction);
      if (payload.mobileImageId !== undefined) await assertMediaExists(payload.mobileImageId, transaction);

      await banner.update(
        { ...payload, updatedByUserId: request.auth.sub },
        { transaction },
      );
      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "banners",
        entityType: "Banner",
        entityId: banner.id,
        oldValue,
        newValue: banner,
        transaction,
      });
    });
    return getOrThrow(id);
  },

  async remove({ id, request }) {
    const banner = await getOrThrow(id);

    await db.sequelize.transaction(async (transaction) => {
      const oldValue = banner.toJSON();
      await banner.destroy({ transaction });
      await auditLogService.record({
        request,
        action: "DELETE",
        module: "banners",
        entityType: "Banner",
        entityId: id,
        oldValue,
        transaction,
      });
    });
  },

  async reorder({ order, request }) {
    return db.sequelize.transaction(async (transaction) => {
      const banners = await db.Banner.findAll({ attributes: ["id"], transaction });
      const ownedIds = new Set(banners.map((row) => String(row.id)));
      for (const entry of order) {
        if (!ownedIds.has(String(entry.id))) {
          throw new AppError("Banner does not exist", {
            statusCode: 422,
            code: "BANNER_MISMATCH",
          });
        }
      }

      await Promise.all(
        order.map((entry) =>
          db.Banner.update({ sortOrder: entry.sortOrder }, { where: { id: entry.id }, transaction }),
        ),
      );

      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "banners",
        entityType: "Banner",
        entityId: null,
        newValue: { reorder: order },
        transaction,
      });
    });
  },
};
