import { Op } from "sequelize";
import { CATEGORY_STATUSES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { nextAvailableCategorySlug } from "./category.slug.js";
import { buildCategoryTree, createCategoryPathMap } from "./category.tree.js";

const categoryInclude = [
  {
    model: db.Category,
    as: "parent",
    attributes: ["id", "name", "slug", "parentId", "status"],
    required: false,
  },
  { model: db.Media, as: "image", required: false },
  { model: db.Media, as: "ogImage", required: false },
  { model: db.Metal, as: "metal", required: false },
];

const assertMediaExists = async (mediaId, field, transaction) => {
  if (!mediaId) return;
  const exists = await db.Media.count({ where: { id: mediaId }, transaction });
  if (!exists) {
    throw new AppError(`Selected ${field} does not exist`, {
      statusCode: 422,
      code: "CATEGORY_MEDIA_NOT_FOUND",
      details: { field, mediaId },
    });
  }
};

const assertMetalExists = async (metalId, transaction) => {
  if (!metalId) return;
  const exists = await db.Metal.count({ where: { id: metalId, isActive: true }, transaction });
  if (!exists) {
    throw new AppError("Selected metal does not exist or is inactive", {
      statusCode: 422,
      code: "CATEGORY_METAL_NOT_FOUND",
      details: { field: "metalId", metalId },
    });
  }
};

const assertValidParent = async ({ categoryId, parentId, transaction }) => {
  if (!parentId) return;
  if (categoryId && String(categoryId) === String(parentId)) {
    throw new AppError("A category cannot be its own parent", {
      statusCode: 422,
      code: "CATEGORY_SELF_PARENT",
    });
  }

  let current = await db.Category.findByPk(parentId, { transaction });
  if (!current) {
    throw new AppError("Selected parent category does not exist", {
      statusCode: 422,
      code: "PARENT_CATEGORY_NOT_FOUND",
    });
  }

  const visited = new Set();
  while (current) {
    const currentId = String(current.id);
    if (visited.has(currentId)) break;
    if (categoryId && currentId === String(categoryId)) {
      throw new AppError("Category hierarchy cannot contain a cycle", {
        statusCode: 422,
        code: "CATEGORY_HIERARCHY_CYCLE",
      });
    }
    visited.add(currentId);
    current = current.parentId
      ? await db.Category.findByPk(current.parentId, { transaction })
      : null;
  }
};

const addPaths = async (rows, transaction) => {
  const allCategories = await db.Category.findAll({
    attributes: ["id", "parentId", "name"],
    transaction,
  });
  const pathMap = createCategoryPathMap(allCategories);
  return rows.map((row) => {
    const plain = typeof row.toJSON === "function" ? row.toJSON() : row;
    return { ...plain, ...pathMap.get(String(plain.id)) };
  });
};

const generateUniqueSlug = async (name, { excludeId, transaction } = {}) => {
  const baseSlug = nextAvailableCategorySlug(name);
  const existing = await db.Category.unscoped().findAll({
    attributes: ["slug"],
    where: {
      slug: { [Op.like]: `${baseSlug}%` },
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    },
    transaction,
    raw: true,
  });

  return nextAvailableCategorySlug(
    name,
    existing.map(({ slug }) => slug),
  );
};

export const categoryService = {
  async list(query) {
    const where = {};
    if (query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query.search}%` } },
        { slug: { [Op.like]: `%${query.search}%` } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.parentId === "root") where.parentId = null;
    else if (query.parentId) where.parentId = query.parentId;
    if (query.metalId !== undefined) where.metalId = query.metalId;

    const { rows, count } = await db.Category.findAndCountAll({
      where,
      attributes: {
        include: [
          [
            db.sequelize.literal(
              "(SELECT COUNT(*) FROM categories children WHERE children.parent_id = Category.id AND children.is_deleted = false)",
            ),
            "childCount",
          ],
          [
            db.sequelize.literal(
              `(SELECT COUNT(DISTINCT productMappings.product_id)
               FROM product_category_mappings productMappings
               WHERE productMappings.category_id = Category.id)`,
            ),
            "productCount",
          ],
        ],
      },
      include: categoryInclude,
      order: [
        [query.sortBy, query.sortDirection.toUpperCase()],
        ["name", "ASC"],
      ],
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      distinct: true,
    });

    return {
      rows: await addPaths(rows),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / query.pageSize),
      },
    };
  },

  async tree(query = {}) {
    const where = {};
    if (query.metalId !== undefined) where.metalId = query.metalId;

    const rows = await db.Category.findAll({
      where,
      attributes: {
        include: [
          [
            db.sequelize.literal(
              "(SELECT COUNT(*) FROM categories children WHERE children.parent_id = Category.id AND children.is_deleted = false)",
            ),
            "childCount",
          ],
          [
            db.sequelize.literal(
              `(SELECT COUNT(DISTINCT productMappings.product_id)
               FROM product_category_mappings productMappings
               WHERE productMappings.category_id = Category.id)`,
            ),
            "productCount",
          ],
        ],
      },
      include: [
        { model: db.Media, as: "image", required: false },
        { model: db.Media, as: "ogImage", required: false },
        { model: db.Metal, as: "metal", required: false },
      ],
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
    });
    const flat = await addPaths(rows);
    return { tree: buildCategoryTree(flat), flat };
  },

  async getById(id) {
    const category = await db.Category.findByPk(id, {
      include: [
        ...categoryInclude,
        {
          model: db.Category,
          as: "children",
          attributes: ["id", "name", "slug", "status", "sortOrder"],
          required: false,
        },
      ],
    });
    if (!category) {
      throw new AppError("Category not found", {
        statusCode: 404,
        code: "CATEGORY_NOT_FOUND",
      });
    }
    return (await addPaths([category]))[0];
  },

  async create({ payload, request }) {
    return db.sequelize.transaction(async (transaction) => {
      await assertValidParent({ parentId: payload.parentId, transaction });
      await assertMetalExists(payload.metalId, transaction);
      await assertMediaExists(payload.mediaId, "category image", transaction);
      await assertMediaExists(payload.ogMediaId, "Open Graph image", transaction);

      const category = await db.Category.create(
        {
          ...payload,
          slug: await generateUniqueSlug(payload.name, { transaction }),
          parentId: payload.parentId ?? null,
          status: CATEGORY_STATUSES.ACTIVE,
          sortOrder: payload.sortOrder ?? 0,
          createdByUserId: request.auth.sub,
          updatedByUserId: request.auth.sub,
        },
        { transaction },
      );
      await auditLogService.record({
        request,
        action: "CREATE",
        module: "categories",
        entityType: "Category",
        entityId: category.id,
        newValue: category,
        transaction,
      });
      return category;
    });
  },

  async update({ id, payload, request }) {
    const category = await db.Category.findByPk(id);
    if (!category) {
      throw new AppError("Category not found", {
        statusCode: 404,
        code: "CATEGORY_NOT_FOUND",
      });
    }
    const oldValue = category.toJSON();

    await db.sequelize.transaction(async (transaction) => {
      if (payload.parentId !== undefined) {
        await assertValidParent({
          categoryId: category.id,
          parentId: payload.parentId,
          transaction,
        });
      }
      if (payload.mediaId !== undefined) {
        await assertMediaExists(payload.mediaId, "category image", transaction);
      }
      if (payload.ogMediaId !== undefined) {
        await assertMediaExists(payload.ogMediaId, "Open Graph image", transaction);
      }
      if (payload.metalId !== undefined) {
        await assertMetalExists(payload.metalId, transaction);
      }

      await category.update(
        {
          ...payload,
          ...(payload.name && payload.name !== category.name
            ? {
                slug: await generateUniqueSlug(payload.name, {
                  excludeId: category.id,
                  transaction,
                }),
              }
            : {}),
          updatedByUserId: request.auth.sub,
        },
        { transaction },
      );
      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "categories",
        entityType: "Category",
        entityId: category.id,
        oldValue,
        newValue: category,
        transaction,
      });
    });
    return category;
  },

  async remove({ id, request }) {
    const category = await db.Category.findByPk(id);
    if (!category) {
      throw new AppError("Category not found", {
        statusCode: 404,
        code: "CATEGORY_NOT_FOUND",
      });
    }
    const [childCount, productCount] = await Promise.all([
      db.Category.count({ where: { parentId: category.id } }),
      db.ProductCategoryMapping.count({ where: { categoryId: category.id } }),
    ]);
    if (childCount || productCount) {
      throw new AppError("Category cannot be deleted while it has children or mapped products", {
        statusCode: 409,
        code: "CATEGORY_IN_USE",
        details: { childCount, productCount },
      });
    }

    await db.sequelize.transaction(async (transaction) => {
      const oldValue = category.toJSON();
      await category.update(
        {
          slug: `${category.slug.slice(0, 150)}--deleted-${category.id}`,
          status: CATEGORY_STATUSES.INACTIVE,
          isDeleted: true,
          updatedByUserId: request.auth.sub,
        },
        { transaction },
      );
      await auditLogService.record({
        request,
        action: "DELETE",
        module: "categories",
        entityType: "Category",
        entityId: category.id,
        oldValue,
        newValue: category,
        transaction,
      });
    });
  },
};
