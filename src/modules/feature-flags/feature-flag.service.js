import { Op } from "sequelize";
import { cacheService } from "../../integrations/cache/cache.service.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { DEFAULT_FEATURE_FLAGS } from "./feature-flag.seeds.js";

const CACHE_TTL = 60; // 60 s
const CACHE_KEY_ALL = "feature_flags:all";
const envCacheKey = (env) => `feature_flags:enabled:${env}`;

const flagFields = [
  "key", "name", "module", "description", "isEnabled",
  "environment", "targetAudience", "rolloutPercentage", "metadata",
];

const filterPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload ?? {}).filter(
      ([k, v]) => flagFields.includes(k) && v !== undefined,
    ),
  );

const getFlagOrThrow = async (id) => {
  const flag = await db.FeatureFlag.findByPk(id);
  if (!flag) throw new AppError("Feature flag not found", { statusCode: 404, code: "RESOURCE_NOT_FOUND" });
  return flag;
};

const recordAudit = (featureFlagId, actorUserId, action, oldValue, newValue, transaction) =>
  db.FeatureFlagAudit.create(
    { featureFlagId, actorUserId: actorUserId ?? null, action, oldValue, newValue },
    { transaction },
  );

const invalidateCache = async () => {
  await Promise.allSettled([
    cacheService.delete(CACHE_KEY_ALL),
    cacheService.delete(envCacheKey("web")),
    cacheService.delete(envCacheKey("mobile")),
    cacheService.delete(envCacheKey("server")),
    cacheService.delete(envCacheKey("all")),
  ]);
};

export const featureFlagService = {
  async list({ page = 1, pageSize = 20, search, isEnabled, environment, module } = {}) {
    const where = {};
    if (search) {
      where[Op.or] = [
        { key: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { module: { [Op.like]: `%${search}%` } },
      ];
    }
    if (isEnabled === "true" || isEnabled === true) where.isEnabled = true;
    if (isEnabled === "false" || isEnabled === false) where.isEnabled = false;
    if (environment && environment !== "all") where.environment = { [Op.in]: [environment, "all"] };
    if (module) where.module = module;

    const { rows, count } = await db.FeatureFlag.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
    });

    return {
      rows,
      meta: { page, pageSize, totalItems: count, totalPages: Math.ceil(count / pageSize) },
    };
  },

  async getById(id) {
    return getFlagOrThrow(id);
  },

  async getAuditTrail(id, { page = 1, pageSize = 20 } = {}) {
    await getFlagOrThrow(id);
    const { rows, count } = await db.FeatureFlagAudit.findAndCountAll({
      where: { featureFlagId: id },
      include: [{ model: db.User, as: "actor", attributes: ["id", "email", "username"] }],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return { rows, meta: { page, pageSize, totalItems: count, totalPages: Math.ceil(count / pageSize) } };
  },

  async create({ payload, request }) {
    const data = filterPayload(payload);
    return db.sequelize.transaction(async (t) => {
      const flag = await db.FeatureFlag.create(data, { transaction: t });
      await recordAudit(flag.id, request?.auth?.sub, "CREATED", null, flag.toJSON(), t);
      await invalidateCache();
      return flag;
    });
  },

  async update({ id, payload, request }) {
    const flag = await getFlagOrThrow(id);
    const old = flag.toJSON();
    const data = filterPayload(payload);
    return db.sequelize.transaction(async (t) => {
      await flag.update(data, { transaction: t });
      await recordAudit(id, request?.auth?.sub, "UPDATED", old, flag.toJSON(), t);
      await invalidateCache();
      return flag;
    });
  },

  async toggle({ id, request }) {
    const flag = await getFlagOrThrow(id);
    const old = flag.toJSON();
    return db.sequelize.transaction(async (t) => {
      await flag.update({ isEnabled: !flag.isEnabled }, { transaction: t });
      await recordAudit(id, request?.auth?.sub, "TOGGLED", old, flag.toJSON(), t);
      await invalidateCache();
      return flag;
    });
  },

  async remove({ id, request }) {
    const flag = await getFlagOrThrow(id);
    const old = flag.toJSON();
    return db.sequelize.transaction(async (t) => {
      await recordAudit(id, request?.auth?.sub, "DELETED", old, null, t);
      await flag.destroy({ transaction: t });
      await invalidateCache();
    });
  },

  async isEnabled(key) {
    const cached = await cacheService.get(CACHE_KEY_ALL);
    if (cached) {
      const found = cached.find((f) => f.key === key);
      return found?.isEnabled ?? false;
    }
    const flag = await db.FeatureFlag.findOne({ where: { key } });
    return flag?.isEnabled ?? false;
  },

  async getPublicConfig(env) {
    const cacheKey = envCacheKey(env);
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const envFilter = env === "all" ? {} : { environment: { [Op.in]: [env, "all"] } };
    const flags = await db.FeatureFlag.findAll({
      where: { isEnabled: true, ...envFilter },
      attributes: ["key", "rolloutPercentage", "metadata"],
    });

    const config = Object.fromEntries(flags.map((f) => [f.key, {
      enabled: true,
      rolloutPercentage: f.rolloutPercentage,
      metadata: f.metadata ?? {},
    }]));

    await cacheService.set(cacheKey, config, CACHE_TTL);
    return config;
  },

  async getStats() {
    const [total, enabled, lastAudit] = await Promise.all([
      db.FeatureFlag.count(),
      db.FeatureFlag.count({ where: { isEnabled: true } }),
      db.FeatureFlagAudit.findOne({
        order: [["createdAt", "DESC"]],
        include: [{ model: db.User, as: "actor", attributes: ["id", "email"] }],
      }),
    ]);
    return {
      total,
      enabled,
      disabled: total - enabled,
      lastUpdatedAt: lastAudit?.createdAt ?? null,
      lastUpdatedBy: lastAudit?.actor?.email ?? null,
    };
  },

  async distinctModules() {
    const rows = await db.FeatureFlag.findAll({
      attributes: ["module"],
      where: { module: { [Op.not]: null } },
      group: ["module"],
      raw: true,
    });
    return rows.map((r) => r.module).filter(Boolean).sort();
  },

  /**
   * Upsert all DEFAULT_FEATURE_FLAGS on startup.
   * Only inserts flags whose `key` does not already exist — never overwrites
   * a flag that an admin has already edited (e.g. toggled off).
   * Add new entries to feature-flag.seeds.js to include them in future runs.
   */
  async seedDefaults(logger) {
    let seeded = 0;
    for (const flag of DEFAULT_FEATURE_FLAGS) {
      const [, created] = await db.FeatureFlag.findOrCreate({
        where: { key: flag.key },
        defaults: flag,
      });
      if (created) seeded++;
    }
    if (seeded > 0) {
      logger?.info(`Feature flags: seeded ${seeded} default flag(s)`);
      await invalidateCache();
    } else {
      logger?.info("Feature flags: all defaults already present, nothing to seed");
    }
  },
};
