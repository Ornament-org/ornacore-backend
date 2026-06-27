import { Op } from "sequelize";
import { PRODUCT_STATUSES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { slugify } from "../../shared/utils/slugify.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { pricingService } from "../pricing/pricing.service.js";

export const productInclude = [
  { model: db.Metal, as: "metal" },
  {
    model: db.ProductCategoryMapping,
    as: "categoryMappings",
    required: false,
    include: [{ model: db.Category, as: "category", required: false }],
  },
  {
    model: db.ProductVariant,
    as: "variants",
    required: false,
    include: [{ model: db.Inventory, as: "inventory", required: false }],
  },
  {
    model: db.ProductImage,
    as: "images",
    required: false,
    include: [{ model: db.Media, as: "media", required: false }],
  },
];

const assertMetalExists = async (metalId, transaction) => {
  const exists = await db.Metal.count({ where: { id: metalId, isActive: true }, transaction });
  if (!exists) {
    throw new AppError("Selected metal does not exist or is inactive", {
      statusCode: 422,
      code: "PRODUCT_METAL_NOT_FOUND",
      details: { field: "metalId", metalId },
    });
  }
};

const assertCategoryMappings = async (mappings, existingCategoryIds, metalId, transaction) => {
  const categoryIds = mappings.map(({ categoryId }) => categoryId);
  const categories = await db.Category.findAll({
    where: { id: categoryIds },
    transaction,
  });

  if (categories.length !== categoryIds.length) {
    const availableIds = new Set(categories.map(({ id }) => String(id)));
    const unavailableCategoryIds = categoryIds.filter((id) => !availableIds.has(String(id)));
    throw new AppError("One or more selected categories are unavailable", {
      statusCode: 422,
      code: "PRODUCT_CATEGORY_UNAVAILABLE",
      details: { unavailableCategoryIds },
    });
  }

  const existingIds = new Set(existingCategoryIds.map(String));
  const newlySelectedInactiveIds = categories
    .filter(({ id, status }) => status !== "ACTIVE" && !existingIds.has(String(id)))
    .map(({ id }) => id);
  if (newlySelectedInactiveIds.length) {
    throw new AppError("Inactive categories cannot be newly assigned to a product", {
      statusCode: 422,
      code: "PRODUCT_CATEGORY_INACTIVE",
      details: { inactiveCategoryIds: newlySelectedInactiveIds },
    });
  }

  const mismatchedCategoryIds = categories
    .filter((category) => category.metalId && String(category.metalId) !== String(metalId))
    .map(({ id }) => id);
  if (mismatchedCategoryIds.length) {
    throw new AppError("Selected categories must belong to the product metal", {
      statusCode: 422,
      code: "PRODUCT_CATEGORY_METAL_MISMATCH",
      details: { field: "categoryMappings", metalId, mismatchedCategoryIds },
    });
  }
};

const replaceCategoryMappings = async ({ productId, mappings, metalId, transaction }) => {
  const existingMappings = await db.ProductCategoryMapping.findAll({
    attributes: ["categoryId"],
    where: { productId },
    transaction,
    raw: true,
  });
  await assertCategoryMappings(
    mappings,
    existingMappings.map(({ categoryId }) => categoryId),
    metalId,
    transaction,
  );
  await db.ProductCategoryMapping.destroy({ where: { productId }, transaction });
  await db.ProductCategoryMapping.bulkCreate(
    mappings.map((mapping, index) => ({
      productId,
      categoryId: mapping.categoryId,
      isPrimary: mapping.isPrimary,
      primaryProductId: mapping.isPrimary ? productId : null,
      sortOrder: mapping.sortOrder ?? index,
    })),
    { transaction },
  );
};

const createVariantRecords = async ({ product, variants, request, transaction }) => {
  for (const variantInput of variants) {
    const variant = await db.ProductVariant.create(
      {
        productId: product.id,
        sku: variantInput.sku,
        name: variantInput.name ?? null,
        purity: variantInput.purity ?? null,
        karat: variantInput.karat ?? null,
        tunch: variantInput.tunch ?? null,
        weightGrams: variantInput.weightGrams ?? null,
        minimumOrderQuantity: variantInput.minimumOrderQuantity,
        attributes: variantInput.attributes ?? null,
        isActive: variantInput.isActive ?? true,
      },
      { transaction },
    );
    await db.Inventory.create(
      {
        productVariantId: variant.id,
        onHandQuantity: variantInput.openingStock ?? 0,
        reservedQuantity: 0,
        damagedQuantity: 0,
        reorderLevel: variantInput.reorderLevel ?? 0,
      },
      { transaction },
    );
    if (Number(variantInput.openingStock ?? 0) > 0) {
      await db.InventoryMovement.create(
        {
          inventoryId: (
            await db.Inventory.findOne({
              where: { productVariantId: variant.id },
              transaction,
            })
          ).id,
          movementType: "STOCK_IN",
          quantity: variantInput.openingStock,
          balanceAfter: variantInput.openingStock,
          reason: "Opening stock",
          createdByUserId: request.auth.sub,
        },
        { transaction },
      );
    }
    if (variantInput.basePrice !== undefined) {
      await db.PricingRule.create(
        {
          productId: product.id,
          productVariantId: variant.id,
          ruleType: "FIXED",
          basePrice: variantInput.basePrice,
          priority: 0,
          isActive: true,
        },
        { transaction },
      );
    }
  }
};

const adminList = async (request, response) => {
  try {
    const { page, pageSize, search, status, metalId, categoryId } = request.validated.query;
    const where = {};
    if (status) where.status = status;
    if (metalId) where.metalId = metalId;
    if (categoryId) {
      const normalizedCategoryId = Number(categoryId);
      if (Number.isInteger(normalizedCategoryId) && normalizedCategoryId > 0) {
        where[Op.and] = [
          db.sequelize.literal(
            `EXISTS (
              SELECT 1
              FROM product_category_mappings categoryFilter
              WHERE categoryFilter.product_id = Product.id
                AND categoryFilter.category_id = ${normalizedCategoryId}
            )`,
          ),
        ];
      }
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { designCode: { [Op.like]: `%${search}%` } },
      ];
    }
    const { rows, count } = await db.Product.findAndCountAll({
      where,
      include: productInclude,
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
    });
    response.json(
      ApiResponse.success({
        data: rows,
        meta: {
          page,
          pageSize,
          totalItems: count,
          totalPages: Math.ceil(count / pageSize),
        },
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const adminGetById = async (request, response) => {
  try {
    const product = await db.Product.findByPk(request.validated.params.id, {
      include: productInclude,
    });
    if (!product) {
      throw new AppError("Product not found", {
        statusCode: 404,
        code: "PRODUCT_NOT_FOUND",
      });
    }
    response.json(ApiResponse.success({ data: product }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/products
  {
    "metalId": 1,
    "designCode": "RNG-001",
    "name": "Classic Gold Ring",
    "description": "Handcrafted 22K gold ring",
    "status": "DRAFT",
    "categoryMappings": [{ "categoryId": 3, "isPrimary": true, "sortOrder": 0 }],
    "jewelryAttributes": { "style": "Traditional" },
    "variants": [
      {
        "sku": "RNG-001-22K",
        "purity": "22K",
        "tunch": 91.6,
        "weightGrams": 5.5,
        "minimumOrderQuantity": 1,
        "basePrice": 3200,
        "openingStock": 10,
        "reorderLevel": 2
      }
    ]
  }
*/
const adminCreate = async (request, response) => {
  try {
    const { variants, categoryMappings, ...payload } = request.validated.body;
    const product = await db.sequelize.transaction(async (transaction) => {
      await assertMetalExists(payload.metalId, transaction);
      const created = await db.Product.create(
        {
          ...payload,
          slug: slugify(payload.slug || `${payload.name}-${payload.designCode}`),
          createdByUserId: request.auth.sub,
          updatedByUserId: request.auth.sub,
          publishedAt: payload.status === PRODUCT_STATUSES.ACTIVE ? new Date() : null,
        },
        { transaction },
      );
      await replaceCategoryMappings({
        productId: created.id,
        mappings: categoryMappings,
        metalId: payload.metalId,
        transaction,
      });
      await createVariantRecords({ product: created, variants, request, transaction });
      await auditLogService.record({
        request,
        action: "CREATE",
        module: "products",
        entityType: "Product",
        entityId: created.id,
        newValue: { ...created.toJSON(), categoryMappings, variants },
        transaction,
      });
      return created;
    });
    const result = await db.Product.findByPk(product.id, { include: productInclude });
    response.status(201).json(
      ApiResponse.success({
        message: "Product created successfully",
        data: result,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  PATCH /admin/products/:id
  {
    "name": "Updated Ring Name",
    "status": "ACTIVE",
    "categoryMappings": [{ "categoryId": 3, "isPrimary": true }],
    "variants": [{ "id": 7, "sku": "RNG-001-22K", "tunch": 92.0 }]
  }
*/
const adminUpdate = async (request, response) => {
  try {
    const product = await db.Product.findByPk(request.validated.params.id);
    if (!product) {
      throw new AppError("Product not found", {
        statusCode: 404,
        code: "PRODUCT_NOT_FOUND",
      });
    }
    const { variants, categoryMappings, ...payload } = request.validated.body;
    await db.sequelize.transaction(async (transaction) => {
      const effectiveMetalId = payload.metalId ?? product.metalId;
      if (payload.metalId !== undefined) {
        await assertMetalExists(payload.metalId, transaction);
      }
      if (payload.metalId !== undefined && !categoryMappings) {
        const existingMappings = await db.ProductCategoryMapping.findAll({
          attributes: ["categoryId"],
          where: { productId: product.id },
          transaction,
          raw: true,
        });
        await assertCategoryMappings(
          existingMappings,
          existingMappings.map(({ categoryId }) => categoryId),
          effectiveMetalId,
          transaction,
        );
      }
      await product.update(
        {
          ...payload,
          ...(payload.slug || payload.name || payload.designCode
            ? {
                slug: slugify(
                  payload.slug ||
                    `${payload.name ?? product.name}-${payload.designCode ?? product.designCode}`,
                ),
              }
            : {}),
          updatedByUserId: request.auth.sub,
          ...(payload.status === PRODUCT_STATUSES.ACTIVE && !product.publishedAt
            ? { publishedAt: new Date() }
            : {}),
        },
        { transaction },
      );
      if (categoryMappings) {
        await replaceCategoryMappings({
          productId: product.id,
          mappings: categoryMappings,
          metalId: effectiveMetalId,
          transaction,
        });
      }
      if (variants) {
        for (const variantInput of variants) {
          if (variantInput.id) {
            const variant = await db.ProductVariant.findOne({
              where: { id: variantInput.id, productId: product.id },
              transaction,
            });
            if (!variant) {
              throw new AppError("Product variant not found", {
                statusCode: 404,
                code: "VARIANT_NOT_FOUND",
              });
            }
            await variant.update(
              {
                sku: variantInput.sku,
                name: variantInput.name ?? null,
                purity: variantInput.purity ?? null,
                karat: variantInput.karat ?? null,
                tunch: variantInput.tunch ?? null,
                weightGrams: variantInput.weightGrams ?? null,
                minimumOrderQuantity: variantInput.minimumOrderQuantity,
                attributes: variantInput.attributes ?? null,
                isActive: variantInput.isActive ?? true,
              },
              { transaction },
            );
          } else {
            await createVariantRecords({
              product,
              variants: [variantInput],
              request,
              transaction,
            });
          }
        }
      }
    });
    response.json(
      ApiResponse.success({
        message: "Product updated successfully",
        data: await db.Product.findByPk(product.id, { include: productInclude }),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  DELETE /admin/products/:id
  (no body — fails with 400 if product has existing orders)
*/
const adminDelete = async (request, response) => {
  try {
    const product = await db.Product.findByPk(request.validated.params.id);
    if (!product) {
      throw new AppError("Product not found", {
        statusCode: 404,
        code: "PRODUCT_NOT_FOUND",
      });
    }

    const orderItemCount = await db.OrderItem.count({
      where: { productId: product.id },
    });
    if (orderItemCount > 0) {
      throw new AppError("Cannot delete product because it is referenced in existing orders", {
        statusCode: 400,
        code: "PRODUCT_HAS_ORDERS",
      });
    }

    await db.sequelize.transaction(async (transaction) => {
      await auditLogService.record({
        request,
        action: "DELETE",
        module: "products",
        entityType: "Product",
        entityId: product.id,
        oldValue: product.toJSON(),
        transaction,
      });
      await product.destroy({ transaction });
    });

    response.json(ApiResponse.success({ message: "Product deleted successfully" }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/products/:id/images
  {
    "images": [
      { "mediaId": 12, "isPrimary": true, "altText": "Front view", "displayOrder": 0 },
      { "mediaId": 13, "productVariantId": 7, "isPrimary": false, "displayOrder": 1 }
    ]
  }
*/
const adminAddImages = async (request, response) => {
  try {
    const product = await db.Product.findByPk(request.validated.params.id);
    if (!product) {
      throw new AppError("Product not found", {
        statusCode: 404,
        code: "PRODUCT_NOT_FOUND",
      });
    }
    const images = await db.sequelize.transaction(async (transaction) => {
      const payload = request.validated.body.images;
      if (payload.some((image) => image.isPrimary)) {
        await db.ProductImage.update(
          { isPrimary: false },
          { where: { productId: product.id }, transaction },
        );
      }
      for (const image of payload) {
        const media = await db.Media.findByPk(image.mediaId, { transaction });
        if (!media) {
          throw new AppError(`Media ${image.mediaId} not found`, {
            statusCode: 422,
            code: "MEDIA_NOT_FOUND",
          });
        }
        if (image.productVariantId) {
          const variant = await db.ProductVariant.findOne({
            where: { id: image.productVariantId, productId: product.id },
            transaction,
          });
          if (!variant) {
            throw new AppError("Image variant does not belong to this product", {
              statusCode: 422,
              code: "INVALID_IMAGE_VARIANT",
            });
          }
        }
      }
      return db.ProductImage.bulkCreate(
        payload.map((image, index) => ({
          productId: product.id,
          productVariantId: image.productVariantId ?? null,
          mediaId: image.mediaId,
          altText: image.altText ?? product.name,
          isPrimary: image.isPrimary ?? index === 0,
          displayOrder: image.displayOrder ?? index,
        })),
        { transaction },
      );
    });
    response.status(201).json(
      ApiResponse.success({
        message:
          images.length === 1
            ? "Product image added successfully"
            : `${images.length} product images added successfully`,
        data: images,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const adminDeleteImage = async (request, response) => {
  try {
    await db.sequelize.transaction(async (transaction) => {
      const image = await db.ProductImage.findOne({
        where: {
          id: request.validated.params.imageId,
          productId: request.validated.params.id,
        },
        transaction,
      });
      if (!image) {
        throw new AppError("Product image not found", {
          statusCode: 404,
          code: "PRODUCT_IMAGE_NOT_FOUND",
        });
      }

      const wasPrimary = image.isPrimary;
      await image.destroy({ transaction });

      if (wasPrimary) {
        const nextImage = await db.ProductImage.findOne({
          where: { productId: request.validated.params.id },
          order: [
            ["displayOrder", "ASC"],
            ["id", "ASC"],
          ],
          transaction,
        });
        if (nextImage) {
          await nextImage.update({ isPrimary: true }, { transaction });
        }
      }
    });
    response.json(ApiResponse.success({ message: "Product image removed" }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const shopkeeperList = async (request, response) => {
  try {
    const where = { status: PRODUCT_STATUSES.ACTIVE };
    const metalId = Number(request.query.metalId);
    if (Number.isInteger(metalId) && metalId > 0) {
      where.metalId = metalId;
    }
    const categoryId = Number(request.query.categoryId);
    if (Number.isInteger(categoryId) && categoryId > 0) {
      where[Op.and] = [
        db.sequelize.literal(
          `EXISTS (
            SELECT 1
            FROM product_category_mappings categoryFilter
            WHERE categoryFilter.product_id = Product.id
              AND categoryFilter.category_id = ${categoryId}
          )`,
        ),
      ];
    }
    if (request.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${request.query.search}%` } },
        { designCode: { [Op.like]: `%${request.query.search}%` } },
      ];
    }
    const rows = await db.Product.findAll({
      where,
      include: productInclude,
      order: [["publishedAt", "DESC"]],
      limit: Math.min(Number(request.query.limit) || 20, 100),
    });
    const data = await Promise.all(
      rows.map(async (product) => {
        const plain = product.toJSON();
        plain.variants = await Promise.all(
          product.variants.map(async (variant) => {
            try {
              const price = await pricingService.calculateVariantPrice({
                shopkeeper: request.shopkeeper,
                variant,
                quantity: variant.minimumOrderQuantity,
              });
              return {
                ...variant.toJSON(),
                yourPrice: price.unitPrice.toFixed(4),
                pricingSnapshot: price.snapshot,
              };
            } catch {
              return { ...variant.toJSON(), yourPrice: null };
            }
          }),
        );
        return plain;
      }),
    );
    response.json(ApiResponse.success({ data }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const productController = {
  adminList,
  adminGetById,
  adminCreate,
  adminUpdate,
  adminDelete,
  adminAddImages,
  adminDeleteImage,
  shopkeeperList,
};
