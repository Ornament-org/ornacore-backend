import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { systemDefaultFor } from "./homepage.defaults.js";

const configInclude = [
  { model: db.Metal, as: "metal", required: false },
  {
    model: db.User,
    as: "updatedBy",
    required: false,
    include: [{ model: db.StaffProfile, as: "staffProfile", required: false }],
  },
];

const getConfigOrThrow = async (id, { transaction, withSections = false } = {}) => {
  const config = await db.HomepageConfig.findByPk(id, {
    include: withSections
      ? [...configInclude, { model: db.HomepageSection, as: "sections" }]
      : configInclude,
    order: withSections ? [[{ model: db.HomepageSection, as: "sections" }, "sortOrder", "ASC"]] : undefined,
    transaction,
  });
  if (!config) {
    throw new AppError("Homepage configuration not found", {
      statusCode: 404,
      code: "HOMEPAGE_NOT_FOUND",
    });
  }
  return config;
};

const getSectionOrThrow = async (homepageId, sectionId, transaction) => {
  const section = await db.HomepageSection.findOne({
    where: { id: sectionId, homepageId },
    transaction,
  });
  if (!section) {
    throw new AppError("Homepage section not found", {
      statusCode: 404,
      code: "HOMEPAGE_SECTION_NOT_FOUND",
    });
  }
  return section;
};

const findActiveConfig = async (where) =>
  db.HomepageConfig.findOne({
    where: { ...where, status: "ACTIVE" },
    order: [
      ["isDefault", "DESC"],
      ["updatedAt", "DESC"],
    ],
  });

export const homepageService = {
  // Reads the live sections directly — there is no draft/publish/version-snapshot
  // layer, whatever an admin saves is what the storefront serves on the next request.
  async resolveHomepage({ audience, metalId }) {
    let config = null;
    if (metalId) {
      config = await findActiveConfig({ audienceType: audience, metalId });
    }
    if (!config) {
      config = await findActiveConfig({ audienceType: audience, metalId: null });
    }
    if (!config) {
      config = await findActiveConfig({ audienceType: "GLOBAL", metalId: null });
    }
    if (!config) {
      return systemDefaultFor(audience);
    }

    const sections = await db.HomepageSection.findAll({
      where: { homepageId: config.id, isActive: true },
      order: [["sortOrder", "ASC"]],
    });

    return {
      homepage: {
        homepageKey: config.homepageKey,
        audienceType: config.audienceType,
        metalId: config.metalId === null ? null : String(config.metalId),
        title: config.title,
        source: "LIVE",
      },
      sections: sections.map((section, index) => ({
        sectionType: section.sectionType,
        sectionKey: section.sectionKey,
        title: section.title ?? null,
        subtitle: section.subtitle ?? null,
        config: section.configJson ?? {},
        sortOrder: section.sortOrder ?? index,
      })),
    };
  },

  async listConfigs({ audience, metalId, status } = {}) {
    const where = {};
    if (audience) where.audienceType = audience;
    if (metalId !== undefined) where.metalId = metalId;
    if (status) where.status = status;

    return db.HomepageConfig.findAll({
      where,
      include: [...configInclude, { model: db.HomepageSection, as: "sections", attributes: ["id"] }],
      order: [
        ["audienceType", "ASC"],
        ["updatedAt", "DESC"],
      ],
    });
  },

  async getConfigWithSections(id) {
    return getConfigOrThrow(id, { withSections: true });
  },

  async createConfig({ audienceType, metalId, title, homepageKey, request }) {
    return db.sequelize.transaction(async (transaction) => {
      const key =
        homepageKey ??
        `HOME_${audienceType}${metalId ? `_METAL_${metalId}` : ""}`;

      const existing = await db.HomepageConfig.findOne({
        where: { homepageKey: key },
        transaction,
      });
      if (existing) {
        throw new AppError(`Homepage "${key}" already exists`, {
          statusCode: 409,
          code: "DUPLICATE_RESOURCE",
        });
      }

      const config = await db.HomepageConfig.create(
        {
          homepageKey: key,
          audienceType,
          metalId: metalId ?? null,
          title: title ?? `${audienceType} Homepage`,
          status: "ACTIVE",
          updatedByUserId: request?.auth?.sub ?? null,
        },
        { transaction },
      );

      await auditLogService.record({
        request,
        action: "CREATE",
        module: "homepage",
        entityType: "HomepageConfig",
        entityId: config.id,
        newValue: config,
        transaction,
      });

      return config;
    });
  },

  async updateConfig(id, payload, request) {
    return db.sequelize.transaction(async (transaction) => {
      const config = await getConfigOrThrow(id, { transaction });
      const oldValue = config.toJSON();

      await config.update(
        {
          ...(payload.title !== undefined ? { title: payload.title } : {}),
          ...(payload.isDefault !== undefined ? { isDefault: payload.isDefault } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          updatedByUserId: request?.auth?.sub ?? null,
        },
        { transaction },
      );

      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "homepage",
        entityType: "HomepageConfig",
        entityId: config.id,
        oldValue,
        newValue: config,
        transaction,
      });

      return config;
    });
  },

  async addSection(homepageId, payload, request) {
    return db.sequelize.transaction(async (transaction) => {
      await getConfigOrThrow(homepageId, { transaction });

      const maxSort = await db.HomepageSection.max("sortOrder", {
        where: { homepageId },
        transaction,
      });

      let sectionKey = payload.sectionKey ?? payload.sectionType.toLowerCase();
      let suffix = 1;
      while (await db.HomepageSection.count({ where: { homepageId, sectionKey }, transaction })) {
        suffix += 1;
        sectionKey = `${payload.sectionType.toLowerCase()}_${suffix}`;
      }

      const section = await db.HomepageSection.create(
        {
          homepageId,
          sectionType: payload.sectionType,
          sectionKey,
          title: payload.title ?? null,
          subtitle: payload.subtitle ?? null,
          configJson: payload.config ?? {},
          sortOrder: Number.isFinite(maxSort) ? maxSort + 1 : 0,
          isActive: payload.isActive ?? true,
        },
        { transaction },
      );

      await auditLogService.record({
        request,
        action: "CREATE",
        module: "homepage",
        entityType: "HomepageSection",
        entityId: section.id,
        newValue: section,
        transaction,
      });

      return section;
    });
  },

  async updateSection(homepageId, sectionId, payload, request) {
    return db.sequelize.transaction(async (transaction) => {
      const section = await getSectionOrThrow(homepageId, sectionId, transaction);
      const oldValue = section.toJSON();

      await section.update(
        {
          ...(payload.title !== undefined ? { title: payload.title } : {}),
          ...(payload.subtitle !== undefined ? { subtitle: payload.subtitle } : {}),
          ...(payload.config !== undefined ? { configJson: payload.config } : {}),
          ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
          ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
        },
        { transaction },
      );

      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "homepage",
        entityType: "HomepageSection",
        entityId: section.id,
        oldValue,
        newValue: section,
        transaction,
      });

      return section;
    });
  },

  async deleteSection(homepageId, sectionId, request) {
    return db.sequelize.transaction(async (transaction) => {
      const section = await getSectionOrThrow(homepageId, sectionId, transaction);
      const oldValue = section.toJSON();

      // "Shop by Category" is a mandatory storefront block — it can be hidden
      // via isActive, but a homepage can never be left with zero of them.
      if (section.sectionType === "QUICK_CATEGORIES") {
        const siblingCount = await db.HomepageSection.count({
          where: { homepageId, sectionType: "QUICK_CATEGORIES" },
          transaction,
        });
        if (siblingCount <= 1) {
          throw new AppError("Shop by Category is required and cannot be removed — hide it instead.", {
            statusCode: 422,
            code: "HOMEPAGE_SECTION_REQUIRED",
          });
        }
      }

      await section.destroy({ transaction });
      await auditLogService.record({
        request,
        action: "DELETE",
        module: "homepage",
        entityType: "HomepageSection",
        entityId: sectionId,
        oldValue,
        transaction,
      });
    });
  },

  async duplicateSection(homepageId, sectionId, request) {
    return db.sequelize.transaction(async (transaction) => {
      const source = await getSectionOrThrow(homepageId, sectionId, transaction);

      let suffix = 2;
      let sectionKey = `${source.sectionKey}_copy`;
      while (await db.HomepageSection.count({ where: { homepageId, sectionKey }, transaction })) {
        sectionKey = `${source.sectionKey}_copy_${suffix}`;
        suffix += 1;
      }

      await db.HomepageSection.increment("sortOrder", {
        by: 1,
        where: {
          homepageId,
          sortOrder: { [db.Sequelize.Op.gt]: source.sortOrder },
        },
        transaction,
      });

      const copy = await db.HomepageSection.create(
        {
          homepageId,
          sectionType: source.sectionType,
          sectionKey,
          title: source.title,
          subtitle: source.subtitle,
          configJson: source.configJson,
          sortOrder: source.sortOrder + 1,
          isActive: source.isActive,
        },
        { transaction },
      );

      await auditLogService.record({
        request,
        action: "CREATE",
        module: "homepage",
        entityType: "HomepageSection",
        entityId: copy.id,
        newValue: copy,
        transaction,
      });

      return copy;
    });
  },

  async reorderSections(homepageId, order, request) {
    return db.sequelize.transaction(async (transaction) => {
      await getConfigOrThrow(homepageId, { transaction });
      const sections = await db.HomepageSection.findAll({
        where: { homepageId },
        attributes: ["id"],
        transaction,
      });
      const ownedIds = new Set(sections.map((item) => String(item.id)));

      for (const entry of order) {
        if (!ownedIds.has(String(entry.id))) {
          throw new AppError("Section does not belong to this homepage", {
            statusCode: 422,
            code: "HOMEPAGE_SECTION_MISMATCH",
          });
        }
      }

      await Promise.all(
        order.map((entry) =>
          db.HomepageSection.update(
            { sortOrder: entry.sortOrder },
            { where: { id: entry.id, homepageId }, transaction },
          ),
        ),
      );

      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "homepage",
        entityType: "HomepageConfig",
        entityId: homepageId,
        newValue: { reorder: order },
        transaction,
      });

      return getConfigOrThrow(homepageId, { transaction, withSections: true });
    });
  },
};
