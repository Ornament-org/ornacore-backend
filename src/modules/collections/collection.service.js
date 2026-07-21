import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { nextAvailableCollectionSlug } from "./collection.slug.js";

const collectionInclude = [
  { model: db.Media, as: "image", required: false },
  { model: db.Metal, as: "metal", required: false },
  {
    model: db.CollectionProduct,
    as: "productLinks",
    separate: true,
    order: [["sortOrder", "ASC"]],
    include: [
      {
        model: db.Product,
        as: "product",
        include: [
          { model: db.Metal, as: "metal", required: false },
          {
            model: db.ProductImage,
            as: "images",
            required: false,
            separate: true,
            limit: 1,
            order: [["isPrimary", "DESC"], ["displayOrder", "ASC"]],
            include: [{ model: db.Media, as: "media", required: false }],
          },
        ],
      },
    ],
  },
  {
    model: db.CollectionCategory,
    as: "categoryLinks",
    separate: true,
    order: [["sortOrder", "ASC"]],
    include: [
      {
        model: db.Category,
        as: "category",
        include: [
          { model: db.Metal, as: "metal", required: false },
          { model: db.Media, as: "image", required: false },
        ],
      },
    ],
  },
];

const assertMediaExists = async (mediaId, transaction) => {
  if (!mediaId) return;
  const exists = await db.Media.count({ where: { id: mediaId }, transaction });
  if (!exists) {
    throw new AppError("Selected collection image does not exist", {
      statusCode: 422,
      code: "COLLECTION_MEDIA_NOT_FOUND",
      details: { field: "mediaId", mediaId },
    });
  }
};

const assertMetalExists = async (metalId, transaction) => {
  if (!metalId) return;
  const exists = await db.Metal.count({ where: { id: metalId }, transaction });
  if (!exists) {
    throw new AppError("Selected metal does not exist", {
      statusCode: 422,
      code: "COLLECTION_METAL_NOT_FOUND",
      details: { field: "metalId", metalId },
    });
  }
};

const assertProductsExist = async (productIds, transaction) => {
  if (!productIds?.length) return;
  const count = await db.Product.count({ where: { id: productIds }, transaction });
  if (count !== productIds.length) {
    throw new AppError("One or more selected products do not exist", {
      statusCode: 422,
      code: "COLLECTION_PRODUCT_NOT_FOUND",
      details: { field: "productIds", productIds },
    });
  }
};

const assertCategoriesExist = async (categoryIds, transaction) => {
  if (!categoryIds?.length) return;
  const count = await db.Category.count({ where: { id: categoryIds }, transaction });
  if (count !== categoryIds.length) {
    throw new AppError("One or more selected categories do not exist", {
      statusCode: 422,
      code: "COLLECTION_CATEGORY_NOT_FOUND",
      details: { field: "categoryIds", categoryIds },
    });
  }
};

const syncProducts = async (collectionId, productIds, transaction) => {
  await db.CollectionProduct.destroy({ where: { collectionId }, transaction });
  if (!productIds?.length) return;
  await db.CollectionProduct.bulkCreate(
    productIds.map((productId, index) => ({ collectionId, productId, sortOrder: index })),
    { transaction },
  );
};

const syncCategories = async (collectionId, categoryIds, transaction) => {
  await db.CollectionCategory.destroy({ where: { collectionId }, transaction });
  if (!categoryIds?.length) return;
  await db.CollectionCategory.bulkCreate(
    categoryIds.map((categoryId, index) => ({ collectionId, categoryId, sortOrder: index })),
    { transaction },
  );
};

// A collection is single-typed: PRODUCT collections only ever link products,
// CATEGORY collections only ever link categories. Whenever `type` is present
// in the payload (always true on create; only on update if the admin is
// actively editing composition), both link tables are resynced together so
// switching a collection's type can't leave stale rows in the other table.
const syncCollectionItems = async (collectionId, payload, transaction) => {
  if (payload.type === undefined) {
    if (payload.productIds !== undefined) await syncProducts(collectionId, payload.productIds, transaction);
    if (payload.categoryIds !== undefined) await syncCategories(collectionId, payload.categoryIds, transaction);
    return;
  }
  const nextProductIds = payload.type === "PRODUCT" ? (payload.productIds ?? []) : [];
  const nextCategoryIds = payload.type === "CATEGORY" ? (payload.categoryIds ?? []) : [];
  await syncProducts(collectionId, nextProductIds, transaction);
  await syncCategories(collectionId, nextCategoryIds, transaction);
};

const generateUniqueSlug = async (name, { excludeId, transaction } = {}) => {
  const baseSlug = nextAvailableCollectionSlug(name);
  const existing = await db.Collection.unscoped().findAll({
    attributes: ["slug"],
    where: {
      slug: { [Op.like]: `${baseSlug}%` },
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    },
    transaction,
    raw: true,
  });
  return nextAvailableCollectionSlug(
    name,
    existing.map(({ slug }) => slug),
  );
};

const getOrThrow = async (id) => {
  const collection = await db.Collection.findByPk(id, { include: collectionInclude });
  if (!collection) {
    throw new AppError("Collection not found", { statusCode: 404, code: "COLLECTION_NOT_FOUND" });
  }
  return collection;
};

export const collectionService = {
  async list(query = {}) {
    const where = {};
    if (query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query.search}%` } },
        { slug: { [Op.like]: `%${query.search}%` } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.metalId !== undefined) where.metalId = query.metalId;

    const { rows, count } = await db.Collection.findAndCountAll({
      where,
      include: collectionInclude,
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
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

  // Backs the public storefront row — active collections scoped to a metal
  // (or metal-agnostic "All Metals" collections), no pagination metadata.
  // `ids`, when given, restricts to (and preserves the order of) that exact
  // list — used when the homepage has explicitly curated which collections
  // to show and in what order.
  async listActive({ metalId, ids } = {}) {
    const rows = await db.Collection.findAll({
      where: {
        status: "ACTIVE",
        ...(metalId ? { [Op.or]: [{ metalId }, { metalId: null }] } : {}),
        ...(ids?.length ? { id: ids } : {}),
      },
      include: collectionInclude,
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
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
      await assertMediaExists(payload.mediaId, transaction);
      await assertMetalExists(payload.metalId, transaction);
      await assertProductsExist(payload.type === "PRODUCT" ? payload.productIds : undefined, transaction);
      await assertCategoriesExist(payload.type === "CATEGORY" ? payload.categoryIds : undefined, transaction);

      const collection = await db.Collection.create(
        {
          name: payload.name,
          shortDescription: payload.shortDescription ?? null,
          mediaId: payload.mediaId ?? null,
          metalId: payload.metalId ?? null,
          type: payload.type ?? "PRODUCT",
          status: payload.status ?? "ACTIVE",
          sortOrder: payload.sortOrder ?? 0,
          slug: await generateUniqueSlug(payload.name, { transaction }),
          createdByUserId: request.auth.sub,
          updatedByUserId: request.auth.sub,
        },
        { transaction },
      );
      await syncCollectionItems(collection.id, payload, transaction);
      await auditLogService.record({
        request,
        action: "CREATE",
        module: "collections",
        entityType: "Collection",
        entityId: collection.id,
        newValue: collection,
        transaction,
      });
      await collection.reload({ include: collectionInclude, transaction });
      return collection;
    });
  },

  async update({ id, payload, request }) {
    const collection = await getOrThrow(id);
    const oldValue = collection.toJSON();

    await db.sequelize.transaction(async (transaction) => {
      if (payload.mediaId !== undefined) await assertMediaExists(payload.mediaId, transaction);
      if (payload.metalId !== undefined) await assertMetalExists(payload.metalId, transaction);
      if (payload.productIds !== undefined) await assertProductsExist(payload.productIds, transaction);
      if (payload.categoryIds !== undefined) await assertCategoriesExist(payload.categoryIds, transaction);

      await collection.update(
        {
          ...payload,
          ...(payload.name && payload.name !== collection.name
            ? { slug: await generateUniqueSlug(payload.name, { excludeId: collection.id, transaction }) }
            : {}),
          updatedByUserId: request.auth.sub,
        },
        { transaction },
      );

      await syncCollectionItems(collection.id, payload, transaction);

      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "collections",
        entityType: "Collection",
        entityId: collection.id,
        oldValue,
        newValue: collection,
        transaction,
      });
    });
    return getOrThrow(id);
  },

  async remove({ id, request }) {
    const collection = await getOrThrow(id);

    await db.sequelize.transaction(async (transaction) => {
      const oldValue = collection.toJSON();
      await collection.update(
        {
          slug: `${collection.slug.slice(0, 150)}--deleted-${collection.id}`,
          status: "INACTIVE",
          isDeleted: true,
          updatedByUserId: request.auth.sub,
        },
        { transaction },
      );
      await auditLogService.record({
        request,
        action: "DELETE",
        module: "collections",
        entityType: "Collection",
        entityId: collection.id,
        oldValue,
        transaction,
      });
    });
  },
};
