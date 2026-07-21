import db from "../../database/models/InitializeModels.js";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { fetchBullionsBiharRates } from "./bullions-bihar.scraper.js";

// en-CA formats as YYYY-MM-DD, which matches MySQL's DATEONLY column format —
// avoids an off-by-one-day bug from naive UTC dates near midnight IST.
const todayInAppTimezone = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const assertMetalExists = async (metalId, transaction) => {
  const exists = await db.Metal.count({ where: { id: metalId, isActive: true }, transaction });
  if (!exists) {
    throw new AppError("Selected metal does not exist or is inactive", {
      statusCode: 422,
      code: "METAL_NOT_FOUND",
    });
  }
};

export const rateUnitDisplay = (rateUnit) => ({
  displayUnit: rateUnit === "PER_KG" ? "kg" : rateUnit === "PER_10G" ? "10gm" : "gm",
  unitMultiplier: rateUnit === "PER_KG" ? 1000 : rateUnit === "PER_10G" ? 10 : 1,
});

const toComputedRate = (metal, latest, previous) => {
  const { displayUnit, unitMultiplier } = rateUnitDisplay(metal.rateUnit);
  const currentPrice = latest
    ? Number(latest.basePricePerGram) + Number(latest.extraPerGram)
    : null;
  const previousPrice = previous
    ? Number(previous.basePricePerGram) + Number(previous.extraPerGram)
    : null;
  const change = currentPrice !== null && previousPrice !== null ? currentPrice - previousPrice : null;
  const changePercent =
    change !== null && previousPrice ? Number(((change / previousPrice) * 100).toFixed(2)) : null;

  return {
    metalId: String(metal.id),
    code: metal.code,
    name: metal.name,
    rateUnit: metal.rateUnit,
    displayUnit,
    unitMultiplier,
    basePricePerGram: latest ? Number(latest.basePricePerGram) : null,
    extraPerGram: latest ? Number(latest.extraPerGram) : null,
    currentPrice,
    previousPrice,
    change,
    changePercent,
    displayBasePrice: latest ? Number((Number(latest.basePricePerGram) * unitMultiplier).toFixed(2)) : null,
    displayExtra: latest ? Number((Number(latest.extraPerGram) * unitMultiplier).toFixed(2)) : null,
    displayCurrentPrice: currentPrice === null ? null : Number((currentPrice * unitMultiplier).toFixed(2)),
    displayPreviousPrice: previousPrice === null ? null : Number((previousPrice * unitMultiplier).toFixed(2)),
    displayChange: change === null ? null : Number((change * unitMultiplier).toFixed(2)),
    asOfDate: latest?.rateDate ?? null,
    sourceName: latest?.sourceName ?? null,
    sourceLocation: latest?.sourceLocation ?? null,
    sourceUrl: latest?.sourceUrl ?? null,
    sourceSyncedAt: latest?.sourceSyncedAt ?? null,
    sourceRawUpdate: latest?.sourceRawUpdate ?? null,
  };
};

const getLatestTwoRates = async (metalId) =>
  db.MetalRate.findAll({
    where: { metalId },
    order: [["rateDate", "DESC"]],
    limit: 2,
  });

const normalizeMetalKey = (value) => String(value ?? "").trim().toUpperCase();

export const resolveMetalForParsedRate = (metals, parsedRate) =>
  metals.find((metal) => {
    const code = normalizeMetalKey(metal.code);
    const name = normalizeMetalKey(metal.name);
    const wanted = normalizeMetalKey(parsedRate.metalCode);
    return code === wanted || name === wanted;
  });

export const metalRateService = {
  async upsertToday({
    metalId,
    basePricePerGram,
    extraPerGram,
    request,
    sourceName = null,
    sourceLocation = null,
    sourceUrl = null,
    sourceSyncedAt = null,
    sourceRawUpdate = null,
  }) {
    return db.sequelize.transaction(async (transaction) => {
      await assertMetalExists(metalId, transaction);
      const rateDate = todayInAppTimezone();
      const values = {
        basePricePerGram,
        extraPerGram,
        sourceName,
        sourceLocation,
        sourceUrl,
        sourceSyncedAt,
        sourceRawUpdate,
      };

      const [rate, created] = await db.MetalRate.findOrCreate({
        where: { metalId, rateDate },
        defaults: {
          metalId,
          rateDate,
          ...values,
          createdByUserId: request?.auth?.sub ?? null,
        },
        transaction,
      });

      const oldValue = created ? null : rate.toJSON();
      if (!created) {
        await rate.update(values, { transaction });
      }

      if (request?.auth?.sub) {
        await auditLogService.record({
          request,
          action: created ? "CREATE" : "UPDATE",
          module: "metal-rates",
          entityType: "MetalRate",
          entityId: rate.id,
          oldValue,
          newValue: rate,
          transaction,
        });
      }

      return rate;
    });
  },

  async getCurrentRates() {
    const metals = await db.Metal.findAll({
      where: { isActive: true },
      order: [
        ["displayOrder", "ASC"],
        ["name", "ASC"],
      ],
    });

    return Promise.all(
      metals.map(async (metal) => {
        const [latest, previous] = await getLatestTwoRates(metal.id);
        return toComputedRate(metal, latest, previous);
      }),
    );
  },

  async getCurrentRateForMetal(metalId) {
    const metal = await db.Metal.findByPk(metalId);
    if (!metal) {
      throw new AppError("Metal not found", { statusCode: 404, code: "METAL_NOT_FOUND" });
    }
    const [latest, previous] = await getLatestTwoRates(metalId);
    return toComputedRate(metal, latest, previous);
  },

  async syncFromBullionsBihar({ request } = {}) {
    const parsed = await fetchBullionsBiharRates({
      sourceUrl: env.METAL_RATE_SYNC_URL,
      location: env.METAL_RATE_SYNC_LOCATION,
    });

    const metals = await db.Metal.findAll({ where: { isActive: true } });
    const synced = [];
    const skipped = [];

    for (const parsedRate of parsed.rates) {
      const metal = resolveMetalForParsedRate(metals, parsedRate);
      if (!metal) {
        skipped.push({
          metalCode: parsedRate.metalCode,
          reason: "Metal not found or inactive",
        });
        continue;
      }

      await this.upsertToday({
        metalId: metal.id,
        basePricePerGram: parsedRate.basePricePerGram,
        extraPerGram: 0,
        request,
        sourceName: parsed.sourceName,
        sourceLocation: parsed.sourceLocation,
        sourceUrl: parsed.sourceUrl,
        sourceSyncedAt: parsed.fetchedAt,
        sourceRawUpdate: parsed.sourceRawUpdate,
      });

      synced.push({
        metalId: String(metal.id),
        code: metal.code,
        name: metal.name,
        purity: parsedRate.purity,
        basePricePerGram: parsedRate.basePricePerGram,
      });
    }

    return {
      sourceName: parsed.sourceName,
      sourceLocation: parsed.sourceLocation,
      sourceUrl: parsed.sourceUrl,
      sourceSyncedAt: parsed.fetchedAt,
      sourceRawUpdate: parsed.sourceRawUpdate,
      synced,
      skipped,
    };
  },
};
