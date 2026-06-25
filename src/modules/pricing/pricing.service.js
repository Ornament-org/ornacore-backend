import Decimal from "decimal.js";
import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";

const activeDateWhere = (date) => ({
  isActive: true,
  [Op.and]: [
    {
      [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: date } }],
    },
    {
      [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: date } }],
    },
  ],
});

const filterPayload = (payload, fields) =>
  Object.fromEntries(
    Object.entries(payload ?? {}).filter(
      ([key, value]) => fields.includes(key) && value !== undefined,
    ),
  );

const normalizeBooleanFilter = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const priceGroupFields = ["code", "name", "description", "isActive"];
const pricingRuleFields = [
  "productId",
  "productVariantId",
  "priceGroupId",
  "ruleType",
  "basePrice",
  "makingCharge",
  "percentageValue",
  "minimumQuantity",
  "configuration",
  "priority",
  "startsAt",
  "endsAt",
  "isActive",
];
const shopkeeperPriceOverrideFields = [
  "shopkeeperId",
  "productVariantId",
  "overridePrice",
  "reason",
  "startsAt",
  "endsAt",
  "isActive",
  "createdByUserId",
];

const pricingRuleInclude = [
  { model: db.Product, as: "product", required: false },
  { model: db.ProductVariant, as: "variant", required: false },
  { model: db.PriceGroup, as: "priceGroup", required: false },
];

const shopkeeperPriceOverrideInclude = [
  { model: db.ShopkeeperProfile, as: "shopkeeper", required: false },
  { model: db.ProductVariant, as: "variant", required: false },
];

const listRecords = async ({
  model,
  query,
  where,
  include,
  sortableFields = ["createdAt", "updatedAt", "id"],
  defaultOrder = [["createdAt", "DESC"]],
}) => {
  const { page, pageSize, sortBy, sortDirection } = query;
  const order =
    sortBy && sortableFields.includes(sortBy)
      ? [[sortBy, String(sortDirection).toUpperCase()]]
      : defaultOrder;

  const { rows, count } = await model.findAndCountAll({
    where,
    include,
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
};

const getRecordOrThrow = async ({ model, id, entityType, include }) => {
  const record = await model.findByPk(id, { include });
  if (!record) {
    throw new AppError(`${entityType} not found`, {
      statusCode: 404,
      code: "RESOURCE_NOT_FOUND",
    });
  }
  return record;
};

const createRecord = async ({ model, payload, fields, request, entityType }) =>
  db.sequelize.transaction(async (transaction) => {
    const record = await model.create(filterPayload(payload, fields), { transaction });
    await auditLogService.record({
      request,
      action: "CREATE",
      module: "pricing",
      entityType,
      entityId: record.id,
      newValue: record,
      transaction,
    });
    return record;
  });

const updateRecord = async ({ model, id, payload, fields, request, entityType }) => {
  const record = await getRecordOrThrow({ model, id, entityType });
  const oldValue = record.toJSON();
  await db.sequelize.transaction(async (transaction) => {
    await record.update(filterPayload(payload, fields), { transaction });
    await auditLogService.record({
      request,
      action: "UPDATE",
      module: "pricing",
      entityType,
      entityId: record.id,
      oldValue,
      newValue: record,
      transaction,
    });
  });
  return record;
};

const removeRecord = async ({ model, id, request, entityType }) => {
  const record = await getRecordOrThrow({ model, id, entityType });
  const oldValue = record.toJSON();
  await db.sequelize.transaction(async (transaction) => {
    await record.destroy({ transaction });
    await auditLogService.record({
      request,
      action: "DELETE",
      module: "pricing",
      entityType,
      entityId: oldValue.id,
      oldValue,
      transaction,
    });
  });
};

export const pricingService = {
  async listPriceGroups(query) {
    const where = {};
    if (query.search) {
      where[Op.or] = [
        { code: { [Op.like]: `%${query.search}%` } },
        { name: { [Op.like]: `%${query.search}%` } },
      ];
    }
    const isActive = normalizeBooleanFilter(query.isActive);
    if (isActive !== undefined) where.isActive = isActive;

    return listRecords({
      model: db.PriceGroup,
      query,
      where,
      sortableFields: ["name", "code", "createdAt"],
    });
  },

  async getPriceGroupById(id) {
    return getRecordOrThrow({ model: db.PriceGroup, id, entityType: "PriceGroup" });
  },

  async createPriceGroup({ payload, request }) {
    return createRecord({
      model: db.PriceGroup,
      payload,
      fields: priceGroupFields,
      request,
      entityType: "PriceGroup",
    });
  },

  async updatePriceGroup({ id, payload, request }) {
    return updateRecord({
      model: db.PriceGroup,
      id,
      payload,
      fields: priceGroupFields,
      request,
      entityType: "PriceGroup",
    });
  },

  async removePriceGroup({ id, request }) {
    return removeRecord({ model: db.PriceGroup, id, request, entityType: "PriceGroup" });
  },

  async listPricingRules(query) {
    const where = {};
    for (const field of ["productId", "productVariantId", "priceGroupId", "ruleType"]) {
      if (query[field] !== undefined && query[field] !== "") where[field] = query[field];
    }
    const isActive = normalizeBooleanFilter(query.isActive);
    if (isActive !== undefined) where.isActive = isActive;

    return listRecords({
      model: db.PricingRule,
      query,
      where,
      include: pricingRuleInclude,
    });
  },

  async getPricingRuleById(id) {
    return getRecordOrThrow({
      model: db.PricingRule,
      id,
      entityType: "PricingRule",
      include: pricingRuleInclude,
    });
  },

  async createPricingRule({ payload, request }) {
    return createRecord({
      model: db.PricingRule,
      payload,
      fields: pricingRuleFields,
      request,
      entityType: "PricingRule",
    });
  },

  async updatePricingRule({ id, payload, request }) {
    return updateRecord({
      model: db.PricingRule,
      id,
      payload,
      fields: pricingRuleFields,
      request,
      entityType: "PricingRule",
    });
  },

  async removePricingRule({ id, request }) {
    return removeRecord({ model: db.PricingRule, id, request, entityType: "PricingRule" });
  },

  async listShopkeeperPriceOverrides(query) {
    const where = {};
    for (const field of ["shopkeeperId", "productVariantId"]) {
      if (query[field] !== undefined && query[field] !== "") where[field] = query[field];
    }
    const isActive = normalizeBooleanFilter(query.isActive);
    if (isActive !== undefined) where.isActive = isActive;

    return listRecords({
      model: db.ShopkeeperPriceOverride,
      query,
      where,
      include: shopkeeperPriceOverrideInclude,
    });
  },

  async getShopkeeperPriceOverrideById(id) {
    return getRecordOrThrow({
      model: db.ShopkeeperPriceOverride,
      id,
      entityType: "ShopkeeperPriceOverride",
      include: shopkeeperPriceOverrideInclude,
    });
  },

  async createShopkeeperPriceOverride({ payload, request }) {
    return createRecord({
      model: db.ShopkeeperPriceOverride,
      payload: { ...payload, createdByUserId: request.auth.sub },
      fields: shopkeeperPriceOverrideFields,
      request,
      entityType: "ShopkeeperPriceOverride",
    });
  },

  async updateShopkeeperPriceOverride({ id, payload, request }) {
    return updateRecord({
      model: db.ShopkeeperPriceOverride,
      id,
      payload,
      fields: shopkeeperPriceOverrideFields,
      request,
      entityType: "ShopkeeperPriceOverride",
    });
  },

  async removeShopkeeperPriceOverride({ id, request }) {
    return removeRecord({
      model: db.ShopkeeperPriceOverride,
      id,
      request,
      entityType: "ShopkeeperPriceOverride",
    });
  },

  async calculateVariantPrice({ shopkeeper, variant, quantity, transaction }) {
    const now = new Date();
    const override = await db.ShopkeeperPriceOverride.findOne({
      where: {
        shopkeeperId: shopkeeper.id,
        productVariantId: variant.id,
        ...activeDateWhere(now),
      },
      order: [["createdAt", "DESC"]],
      transaction,
    });

    if (override) {
      return {
        unitPrice: new Decimal(override.overridePrice),
        snapshot: {
          source: "SHOPKEEPER_OVERRIDE",
          overrideId: String(override.id),
          unitPrice: override.overridePrice,
        },
      };
    }

    const quantityDecimal = new Decimal(quantity);
    const rules = await db.PricingRule.findAll({
      where: {
        [Op.and]: [
          activeDateWhere(now),
          {
            [Op.or]: [
              { productVariantId: variant.id },
              {
                productVariantId: null,
                productId: variant.productId,
              },
            ],
          },
          { priceGroupId: null },
        ],
      },
      order: [
        ["priority", "DESC"],
        ["minimumQuantity", "DESC"],
      ],
      transaction,
    });

    const applicable = rules.find(
      (rule) => !rule.minimumQuantity || quantityDecimal.greaterThanOrEqualTo(rule.minimumQuantity),
    );
    if (!applicable || applicable.basePrice === null) {
      throw new AppError(`No active price is configured for SKU ${variant.sku}`, {
        statusCode: 409,
        code: "PRODUCT_PRICE_NOT_CONFIGURED",
      });
    }

    let unitPrice = new Decimal(applicable.basePrice);
    if (applicable.ruleType === "PERCENTAGE_MARGIN") {
      unitPrice = unitPrice.plus(
        unitPrice.mul(new Decimal(applicable.percentageValue || 0).div(100)),
      );
    }
    if (applicable.ruleType === "PERCENTAGE_DISCOUNT") {
      unitPrice = unitPrice.minus(
        unitPrice.mul(new Decimal(applicable.percentageValue || 0).div(100)),
      );
    }
    if (applicable.makingCharge) {
      unitPrice = unitPrice.plus(applicable.makingCharge);
    }

    return {
      unitPrice,
      snapshot: {
        source: "PRICING_RULE",
        pricingRuleId: String(applicable.id),
        ruleType: applicable.ruleType,
        basePrice: applicable.basePrice,
        makingCharge: applicable.makingCharge,
        percentageValue: applicable.percentageValue,
        unitPrice: unitPrice.toFixed(4),
      },
    };
  },
};
