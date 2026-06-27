import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const getAttributeOrThrow = async (id, options = {}) => {
  const attr = await db.Attribute.findByPk(id, options);
  if (!attr) {
    throw new AppError("Attribute not found", { statusCode: 404, code: "ATTRIBUTE_NOT_FOUND" });
  }
  return attr;
};

const getValueOrThrow = async (attributeId, valueId) => {
  const val = await db.AttributeValue.findOne({ where: { id: valueId, attributeId } });
  if (!val) {
    throw new AppError("Attribute value not found", {
      statusCode: 404,
      code: "ATTRIBUTE_VALUE_NOT_FOUND",
    });
  }
  return val;
};

// Lazy getter so model references are always resolved at call-time, never at module load
const valuesInclude = () => ({
  model: db.AttributeValue,
  as: "values",
  attributes: ["id", "value", "displayOrder"],
  separate: true,
  order: [["displayOrder", "ASC"], ["value", "ASC"]],
});

export const attributeService = {
  async list({ page = 1, pageSize = 50, search } = {}) {
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } },
      ];
    }
    // Separate count + findAll avoids the findAndCountAll+include+distinct quirk in Sequelize 6
    const [count, rows] = await Promise.all([
      db.Attribute.count({ where }),
      db.Attribute.findAll({
        where,
        include: [valuesInclude()],
        order: [["displayOrder", "ASC"], ["name", "ASC"]],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    ]);
    return { rows, meta: { page, pageSize, totalItems: count, totalPages: Math.ceil(count / pageSize) } };
  },

  async getById(id) {
    return getAttributeOrThrow(id, { include: [valuesInclude()] });
  },

  async create({ name, values = [], displayOrder = 0 }) {
    const slug = slugify(name);
    const existing = await db.Attribute.findOne({ where: { slug } });
    if (existing) {
      throw new AppError("An attribute with this name already exists", {
        statusCode: 409,
        code: "ATTRIBUTE_SLUG_CONFLICT",
      });
    }
    return db.sequelize.transaction(async (t) => {
      const attr = await db.Attribute.create({ name, slug, displayOrder }, { transaction: t });
      if (values.length) {
        await db.AttributeValue.bulkCreate(
          values.map((v, i) => ({
            attributeId: attr.id,
            value: String(v.value ?? v).trim(),
            displayOrder: v.displayOrder ?? i,
          })),
          { transaction: t },
        );
      }
      return db.Attribute.findByPk(attr.id, { include: [valuesInclude()], transaction: t });
    });
  },

  async update(id, { name, displayOrder }) {
    const attr = await getAttributeOrThrow(id);
    const updates = {};
    if (name !== undefined) {
      updates.name = name;
      const slug = slugify(name);
      const conflict = await db.Attribute.findOne({ where: { slug, id: { [Op.ne]: id } } });
      if (conflict) {
        throw new AppError("An attribute with this name already exists", {
          statusCode: 409,
          code: "ATTRIBUTE_SLUG_CONFLICT",
        });
      }
      updates.slug = slug;
    }
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;
    await attr.update(updates);
    return db.Attribute.findByPk(id, { include: [valuesInclude()] });
  },

  async remove(id) {
    const attr = await getAttributeOrThrow(id);
    const valueIds = (
      await db.AttributeValue.findAll({
        attributes: ["id"],
        where: { attributeId: id },
        raw: true,
      })
    ).map((v) => v.id);

    if (valueIds.length > 0) {
      const inUse = await db.ProductVariantAttribute.count({
        where: { attributeValueId: { [Op.in]: valueIds } },
      });
      if (inUse > 0) {
        throw new AppError(
          "Attribute is assigned to one or more product variants and cannot be deleted",
          { statusCode: 409, code: "ATTRIBUTE_IN_USE", details: { variantCount: inUse } },
        );
      }
    }
    await attr.destroy();
  },

  async createValue(attributeId, { value, displayOrder = 0 }) {
    await getAttributeOrThrow(attributeId);
    const trimmed = String(value).trim();
    const existing = await db.AttributeValue.findOne({ where: { attributeId, value: trimmed } });
    if (existing) {
      throw new AppError(`Value "${trimmed}" already exists for this attribute`, {
        statusCode: 409,
        code: "ATTRIBUTE_VALUE_CONFLICT",
      });
    }
    return db.AttributeValue.create({ attributeId, value: trimmed, displayOrder });
  },

  async updateValue(attributeId, valueId, { value, displayOrder }) {
    const val = await getValueOrThrow(attributeId, valueId);
    const updates = {};
    if (value !== undefined) {
      const trimmed = String(value).trim();
      const conflict = await db.AttributeValue.findOne({
        where: { attributeId, value: trimmed, id: { [Op.ne]: valueId } },
      });
      if (conflict) {
        throw new AppError(`Value "${trimmed}" already exists for this attribute`, {
          statusCode: 409,
          code: "ATTRIBUTE_VALUE_CONFLICT",
        });
      }
      updates.value = trimmed;
    }
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;
    await val.update(updates);
    return val;
  },

  async removeValue(attributeId, valueId) {
    const val = await getValueOrThrow(attributeId, valueId);
    const inUse = await db.ProductVariantAttribute.count({ where: { attributeValueId: valueId } });
    if (inUse > 0) {
      throw new AppError("This value is assigned to one or more product variants and cannot be deleted", {
        statusCode: 409,
        code: "ATTRIBUTE_VALUE_IN_USE",
        details: { variantCount: inUse },
      });
    }
    await val.destroy();
  },

  async syncVariantAttributes(variantId, attributeValueIds = []) {
    await db.ProductVariantAttribute.destroy({ where: { variantId } });
    if (attributeValueIds.length === 0) return;

    const values = await db.AttributeValue.findAll({
      where: { id: attributeValueIds },
    });
    if (values.length !== attributeValueIds.length) {
      const found = new Set(values.map((v) => String(v.id)));
      const missing = attributeValueIds.filter((id) => !found.has(String(id)));
      throw new AppError("One or more attribute value IDs are invalid", {
        statusCode: 422,
        code: "ATTRIBUTE_VALUE_NOT_FOUND",
        details: { missingIds: missing },
      });
    }

    await db.ProductVariantAttribute.bulkCreate(
      attributeValueIds.map((attributeValueId) => ({ variantId, attributeValueId })),
      { ignoreDuplicates: true },
    );
  },

  async getVariantAttributes(variantId) {
    return db.ProductVariantAttribute.findAll({
      where: { variantId },
      include: [{
        model: db.AttributeValue,
        as: "attributeValue",
        include: [{ model: db.Attribute, as: "attribute" }],
      }],
    });
  },
};
