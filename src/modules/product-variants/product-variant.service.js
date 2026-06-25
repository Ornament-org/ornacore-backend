import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";

const productVariantFields = [
  "productId",
  "sku",
  "name",
  "purity",
  "karat",
  "tunch",
  "weightGrams",
  "minimumOrderQuantity",
  "attributes",
  "isActive",
];

const productVariantInclude = [
  { model: db.Product, as: "product", required: false },
  { model: db.Inventory, as: "inventory", required: false },
];

const filterProductVariantPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload ?? {}).filter(
      ([key, value]) => productVariantFields.includes(key) && value !== undefined,
    ),
  );

const getProductVariantOrThrow = async (id, options = {}) => {
  const productVariant = await db.ProductVariant.findByPk(id, options);
  if (!productVariant) {
    throw new AppError("ProductVariant not found", {
      statusCode: 404,
      code: "RESOURCE_NOT_FOUND",
    });
  }
  return productVariant;
};

export const productVariantService = {
  async list({ page, pageSize, search, sortBy, sortDirection, productId, isActive }) {
    const where = {};
    if (search) {
      where[Op.or] = [
        { sku: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { purity: { [Op.like]: `%${search}%` } },
      ];
    }
    if (productId) where.productId = productId;
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;

    const sortableFields = new Set(["createdAt", "updatedAt", "id"]);
    const order =
      sortBy && sortableFields.has(sortBy)
        ? [[sortBy, String(sortDirection).toUpperCase()]]
        : [["createdAt", "DESC"]];

    const { rows, count } = await db.ProductVariant.findAndCountAll({
      where,
      include: productVariantInclude,
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

  async getById(id) {
    return getProductVariantOrThrow(id, { include: productVariantInclude });
  },

  async create({ payload, request }) {
    const productVariantPayload = filterProductVariantPayload(payload);
    return db.sequelize.transaction(async (transaction) => {
      const productVariant = await db.ProductVariant.create(productVariantPayload, { transaction });
      await auditLogService.record({
        request,
        action: "CREATE",
        module: "product-variants",
        entityType: "ProductVariant",
        entityId: productVariant.id,
        newValue: productVariant,
        transaction,
      });
      return productVariant;
    });
  },

  async update({ id, payload, request }) {
    const productVariant = await getProductVariantOrThrow(id);
    const oldValue = productVariant.toJSON();
    const productVariantPayload = filterProductVariantPayload(payload);

    await db.sequelize.transaction(async (transaction) => {
      await productVariant.update(productVariantPayload, { transaction });
      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "product-variants",
        entityType: "ProductVariant",
        entityId: productVariant.id,
        oldValue,
        newValue: productVariant,
        transaction,
      });
    });

    return productVariant;
  },

  async remove({ id, request }) {
    const productVariant = await getProductVariantOrThrow(id);
    const oldValue = productVariant.toJSON();

    await db.sequelize.transaction(async (transaction) => {
      await productVariant.destroy({ transaction });
      await auditLogService.record({
        request,
        action: "DELETE",
        module: "product-variants",
        entityType: "ProductVariant",
        entityId: oldValue.id,
        oldValue,
        transaction,
      });
    });
  },
};
