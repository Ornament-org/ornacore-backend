import { Op } from "sequelize";
import { PRODUCT_STATUSES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { slugify } from "../../shared/utils/slugify.js";
import { logger } from "../../config/logger.js";
import { attributeService } from "../attributes/attribute.service.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { pricingService } from "../pricing/pricing.service.js";
import { repairProductImageMediaIndexes } from "./product-image-index.repair.js";

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
    include: [
      { model: db.Inventory, as: "inventory", required: false },
      {
        model: db.AttributeValue,
        as: "attributeValues",
        required: false,
        include: [{ model: db.Attribute, as: "attribute", required: false }],
      },
    ],
  },
  {
    model: db.ProductImage,
    as: "images",
    required: false,
    include: [{ model: db.Media, as: "media", required: false }],
  },
];

const buildSlugSeed = (name, designCode) => {
  const base = [name, designCode].filter(Boolean).join("-");
  return designCode ? base : `${base}-${Date.now().toString(36)}`;
};

const PRODUCT_SLUG_MAX_LENGTH = 220;
const SKU_MAX_LENGTH = 100;

const slugWithSuffix = (baseSlug, suffix) => {
  if (suffix === 1) return baseSlug.slice(0, PRODUCT_SLUG_MAX_LENGTH);
  const suffixText = `-${suffix}`;
  return `${baseSlug.slice(0, PRODUCT_SLUG_MAX_LENGTH - suffixText.length)}${suffixText}`;
};

const nextAvailableProductSlug = async (
  seed,
  { excludeProductId, transaction } = {},
) => {
  const baseSlug = (slugify(seed) || "product").slice(0, PRODUCT_SLUG_MAX_LENGTH);
  const existing = await db.Product.unscoped().findAll({
    attributes: ["slug"],
    where: {
      slug: { [Op.like]: `${baseSlug}%` },
      ...(excludeProductId ? { id: { [Op.ne]: excludeProductId } } : {}),
    },
    transaction,
    raw: true,
  });
  const usedSlugs = new Set(existing.map(({ slug }) => slug));

  for (let suffix = 1; suffix <= 9999; suffix += 1) {
    const candidate = slugWithSuffix(baseSlug, suffix);
    if (!usedSlugs.has(candidate)) return candidate;
  }

  throw new AppError("Unable to generate a unique product slug", {
    statusCode: 409,
    code: "PRODUCT_SLUG_UNAVAILABLE",
    details: { field: "slug", slug: baseSlug },
  });
};

const skuKey = (sku) => String(sku).trim().toLowerCase();

const skuWithSuffix = (baseSku, suffix) => {
  if (suffix === 1) return baseSku.slice(0, SKU_MAX_LENGTH);
  const suffixText = `-${suffix}`;
  return `${baseSku.slice(0, SKU_MAX_LENGTH - suffixText.length)}${suffixText}`;
};

const nextAvailableSku = async (
  requestedSku,
  { excludeVariantId, reservedSkus = new Set(), transaction } = {},
) => {
  const baseSku = String(requestedSku).trim();
  for (let suffix = 1; suffix <= 9999; suffix += 1) {
    const candidate = skuWithSuffix(baseSku, suffix);
    if (reservedSkus.has(skuKey(candidate))) continue;

    const existing = await db.ProductVariant.count({
      where: {
        sku: candidate,
        ...(excludeVariantId ? { id: { [Op.ne]: excludeVariantId } } : {}),
      },
      transaction,
    });
    if (!existing) return candidate;
  }

  throw new AppError("Unable to generate a unique SKU", {
    statusCode: 409,
    code: "PRODUCT_SKU_UNAVAILABLE",
    details: { field: "sku", sku: requestedSku },
  });
};

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

const createVariantRecords = async ({ product, variants, request, transaction, reservedSkus }) => {
  for (const variantInput of variants) {
    const sku = await nextAvailableSku(variantInput.sku, { reservedSkus, transaction });
    reservedSkus?.add(skuKey(sku));

    const variant = await db.ProductVariant.create(
      {
        productId: product.id,
        sku,
        name: variantInput.name ?? null,
        purity: variantInput.purity ?? null,
        karat: variantInput.karat ?? null,
        publicPurity: variantInput.publicPurity ?? null,
        publicKarat: variantInput.publicKarat ?? null,
        tunch: variantInput.tunch ?? null,
        weightGrams: variantInput.weightGrams ?? null,
        minimumOrderQuantity: variantInput.minimumOrderQuantity,
        attributes: variantInput.attributes ?? null,
        isActive: variantInput.isActive ?? true,
      },
      { transaction },
    );
    if (variantInput.attributeValueIds !== undefined) {
      await attributeService.syncVariantAttributes(variant.id, variantInput.attributeValueIds, {
        transaction,
      });
    }
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

const deleteProductPreservingOrderSnapshots = async ({ product, request, transaction }) => {
  const variants = await db.ProductVariant.findAll({
    attributes: ["id"],
    where: { productId: product.id },
    transaction,
  });
  const variantIds = variants.map((variant) => variant.id);

  await db.OrderItem.update(
    { productId: null, productVariantId: null },
    { where: { productId: product.id }, transaction },
  );

  if (variantIds.length) {
    const inventories = await db.Inventory.findAll({
      attributes: ["id"],
      where: { productVariantId: variantIds },
      transaction,
    });
    const inventoryIds = inventories.map((inventory) => inventory.id);

    await db.OrderItem.update(
      { productVariantId: null },
      { where: { productVariantId: variantIds }, transaction },
    );
    await db.CartItem.destroy({ where: { productVariantId: variantIds }, transaction });
    await db.ProductVariantAttribute.destroy({ where: { variantId: variantIds }, transaction });
    await db.ShopkeeperPriceOverride.destroy({
      where: { productVariantId: variantIds },
      transaction,
    });
    if (inventoryIds.length) {
      await db.InventoryMovement.destroy({ where: { inventoryId: inventoryIds }, transaction });
    }
    await db.Inventory.destroy({ where: { productVariantId: variantIds }, transaction });
    await db.ProductVariant.destroy({ where: { id: variantIds }, transaction });
  }

  await db.CollectionProduct.destroy({ where: { productId: product.id }, transaction });
  await db.PricingRule.destroy({ where: { productId: product.id }, transaction });
  await db.ProductImage.destroy({ where: { productId: product.id }, transaction });
  await db.ProductCategoryMapping.destroy({ where: { productId: product.id }, transaction });

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
};

const adminList = async (request, response, next) => {
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
    next(error);
  }
};

const adminGetById = async (request, response, next) => {
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
    next(error);
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
const adminCreate = async (request, response, next) => {
  try {
    const { variants, categoryMappings, ...payload } = request.validated.body;
    const product = await db.sequelize.transaction(async (transaction) => {
      await assertMetalExists(payload.metalId, transaction);
      const created = await db.Product.create(
        {
          ...payload,
          slug: await nextAvailableProductSlug(
            payload.slug || buildSlugSeed(payload.name, payload.designCode),
            { transaction },
          ),
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
      await createVariantRecords({
        product: created,
        variants,
        request,
        transaction,
        reservedSkus: new Set(),
      });
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
    next(error);
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
const adminUpdate = async (request, response, next) => {
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
                slug: await nextAvailableProductSlug(
                  payload.slug ||
                    buildSlugSeed(payload.name ?? product.name, payload.designCode ?? product.designCode),
                  { excludeProductId: product.id, transaction },
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
        const reservedSkus = new Set();
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
            const sku = await nextAvailableSku(variantInput.sku, {
              excludeVariantId: variant.id,
              reservedSkus,
              transaction,
            });
            reservedSkus.add(skuKey(sku));
            await variant.update(
              {
                sku,
                name: variantInput.name ?? null,
                purity: variantInput.purity ?? null,
                karat: variantInput.karat ?? null,
                publicPurity: variantInput.publicPurity ?? null,
                publicKarat: variantInput.publicKarat ?? null,
                tunch: variantInput.tunch ?? null,
                weightGrams: variantInput.weightGrams ?? null,
                minimumOrderQuantity: variantInput.minimumOrderQuantity,
                attributes: variantInput.attributes ?? null,
                isActive: variantInput.isActive ?? true,
              },
              { transaction },
            );
            if (variantInput.attributeValueIds !== undefined) {
              await attributeService.syncVariantAttributes(variant.id, variantInput.attributeValueIds, {
                transaction,
              });
            }
          } else {
            await createVariantRecords({
              product,
              variants: [variantInput],
              request,
              transaction,
              reservedSkus,
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
    next(error);
  }
};

/*
  DELETE /admin/products/:id
  (no body — fails with 400 if product has existing orders)
*/
const adminDelete = async (request, response, next) => {
  try {
    const product = await db.Product.findByPk(request.validated.params.id);
    if (!product) {
      throw new AppError("Product not found", {
        statusCode: 404,
        code: "PRODUCT_NOT_FOUND",
      });
    }

    await db.sequelize.transaction(async (transaction) => {
      await deleteProductPreservingOrderSnapshots({ product, request, transaction });
    });

    response.json(ApiResponse.success({ message: "Product deleted successfully" }));
  } catch (error) {
    next(error);
  }
};

/*
  DELETE /admin/products/bulk
  { "ids": [1, 2, 3] }
  Deletes products even when historical orders reference them. Order items keep
  productNameSnapshot / skuSnapshot / pricingSnapshot and their live product
  references are detached during deletion.
*/
const adminBulkDelete = async (request, response, next) => {
  try {
    const ids = [...new Set(request.validated.body.ids)];
    const products = await db.Product.findAll({ where: { id: ids } });
    const foundIds = new Set(products.map((product) => product.id));

    const deletedIds = [];
    const skipped = [];

    for (const product of products) {
      await db.sequelize.transaction(async (transaction) => {
        await deleteProductPreservingOrderSnapshots({ product, request, transaction });
      });
      deletedIds.push(product.id);
    }

    ids.forEach((id) => {
      if (!foundIds.has(id)) skipped.push({ id, reason: "Not found" });
    });

    const message = skipped.length
      ? `${deletedIds.length} product${deletedIds.length === 1 ? "" : "s"} deleted, ${skipped.length} skipped`
      : `${deletedIds.length} product${deletedIds.length === 1 ? "" : "s"} deleted`;

    response.json(ApiResponse.success({ message, data: { deletedIds, skipped } }));
  } catch (error) {
    next(error);
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
const adminAddImages = async (request, response, next) => {
  try {
    const product = await db.Product.findByPk(request.validated.params.id);
    if (!product) {
      throw new AppError("Product not found", {
        statusCode: 404,
        code: "PRODUCT_NOT_FOUND",
      });
    }
    await repairProductImageMediaIndexes(db, logger);
    let skippedCount = 0;
    const images = await db.sequelize.transaction(async (transaction) => {
      const payload = request.validated.body.images;

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

      if (payload.some((image) => image.isPrimary)) {
        await db.ProductImage.update(
          { isPrimary: false },
          { where: { productId: product.id }, transaction },
        );
      }

      const imageScopeKey = (image) => {
        const target = image.productVariantId ? `variant:${image.productVariantId}` : "product";
        return `${target}:${image.mediaId}`;
      };

      // The same media can be used in the product gallery and in variants,
      // but re-selecting it within the same gallery/variant should update
      // the existing row instead of creating a duplicate.
      const existingRows = await db.ProductImage.findAll({
        where: { productId: product.id, mediaId: payload.map((image) => image.mediaId) },
        transaction,
      });
      const existingByScope = new Map(existingRows.map((row) => [imageScopeKey(row), row]));

      const created = [];
      for (const [index, image] of payload.entries()) {
        const scopeKey = imageScopeKey(image);
        const existingRow = existingByScope.get(scopeKey);
        if (existingRow) {
          skippedCount += 1;
          await existingRow.update(
            {
              isPrimary: image.isPrimary ?? existingRow.isPrimary,
              altText: image.altText ?? existingRow.altText,
              displayOrder: image.displayOrder ?? existingRow.displayOrder,
            },
            { transaction },
          );
          continue;
        }
        const row = await db.ProductImage.create(
          {
            productId: product.id,
            productVariantId: image.productVariantId ?? null,
            mediaId: image.mediaId,
            altText: image.altText ?? product.name,
            isPrimary: image.isPrimary ?? index === 0,
            displayOrder: image.displayOrder ?? index,
          },
          { transaction },
        );
        created.push(row);
        existingByScope.set(scopeKey, row);
      }
      return created;
    });

    const skippedNote = skippedCount
      ? ` (${skippedCount} already attached in the same place — updated instead)`
      : "";
    response.status(images.length ? 201 : 200).json(
      ApiResponse.success({
        message: images.length
          ? `${images.length} product image${images.length === 1 ? "" : "s"} added successfully${skippedNote}`
          : `No new images added — all selected images were already attached in the same place${skippedNote ? ", details updated" : ""}.`,
        data: images,
      }),
    );
  } catch (error) {
    next(error);
  }
};

const adminDeleteImage = async (request, response, next) => {
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
    next(error);
  }
};

const buildCatalogWhere = (query) => {
  const where = { status: PRODUCT_STATUSES.ACTIVE };
  const metalId = Number(query.metalId);
  if (Number.isInteger(metalId) && metalId > 0) {
    where.metalId = metalId;
  }
  const andConditions = [];
  // `categoryIds` (comma-separated) lets the storefront match a parent
  // category together with its subcategories in one query — products are
  // often mapped to a leaf subcategory, so filtering by the parent id alone
  // would miss them. `categoryId` (single) is kept for existing callers.
  const categoryIds = String(query.categoryIds ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const singleCategoryId = Number(query.categoryId);
  if (!categoryIds.length && Number.isInteger(singleCategoryId) && singleCategoryId > 0) {
    categoryIds.push(singleCategoryId);
  }
  if (categoryIds.length) {
    andConditions.push(
      db.sequelize.literal(
        `EXISTS (
          SELECT 1
          FROM product_category_mappings categoryFilter
          WHERE categoryFilter.product_id = Product.id
            AND categoryFilter.category_id IN (${categoryIds.join(",")})
        )`,
      ),
    );
  }
  if (query.collection) {
    const collectionSlug = db.sequelize.escape(String(query.collection));
    andConditions.push(
      db.sequelize.literal(
        `(
          EXISTS (
            SELECT 1
            FROM collection_products collectionFilter
            JOIN collections collectionJoin ON collectionJoin.id = collectionFilter.collection_id
            WHERE collectionFilter.product_id = Product.id
              AND collectionJoin.slug = ${collectionSlug}
          )
          OR EXISTS (
            SELECT 1
            FROM collection_categories collectionCategoryFilter
            JOIN collections collectionCategoryJoin
              ON collectionCategoryJoin.id = collectionCategoryFilter.collection_id
            JOIN product_category_mappings categoryProductFilter
              ON categoryProductFilter.category_id = collectionCategoryFilter.category_id
            WHERE categoryProductFilter.product_id = Product.id
              AND collectionCategoryJoin.slug = ${collectionSlug}
          )
        )`,
      ),
    );
  }
  if (andConditions.length) where[Op.and] = andConditions;
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { designCode: { [Op.like]: `%${query.search}%` } },
    ];
  }
  return where;
};

const shopkeeperList = async (request, response, next) => {
  try {
    const rows = await db.Product.findAll({
      where: buildCatalogWhere(request.query),
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
    next(error);
  }
};

// Fully unauthenticated — no shopkeeper to price against, so every variant carries a
// `publicPrice` computed from the generic (priceGroupId: null) pricing rules only, with
// no shopkeeper override/discount applied. This is the "before login" reference price;
// shopkeeperList's `yourPrice` is the real wholesale price once a shopkeeper is signed in.
const publicList = async (request, response, next) => {
  try {
    const rows = await db.Product.findAll({
      where: buildCatalogWhere(request.query),
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
              const price = await pricingService.calculatePublicPrice({
                variant,
                quantity: variant.minimumOrderQuantity,
              });
              return { ...variant.toJSON(), publicPrice: price.unitPrice.toFixed(4) };
            } catch {
              return { ...variant.toJSON(), publicPrice: null };
            }
          }),
        );
        return plain;
      }),
    );
    response.json(ApiResponse.success({ data }));
  } catch (error) {
    next(error);
  }
};

// Product detail pages are addressed by slug, not id — matches shopkeeperList's
// pricing shape (yourPrice) so the detail page and the listing cards it's
// linked from render the exact same price for the same shopkeeper.
const shopkeeperGetBySlug = async (request, response, next) => {
  try {
    const product = await db.Product.findOne({
      where: { slug: request.validated.params.slug, status: PRODUCT_STATUSES.ACTIVE },
      include: productInclude,
    });
    if (!product) {
      throw new AppError("Product not found", {
        statusCode: 404,
        code: "PRODUCT_NOT_FOUND",
      });
    }
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
    response.json(ApiResponse.success({ data: plain }));
  } catch (error) {
    next(error);
  }
};

// Fully unauthenticated counterpart of shopkeeperGetBySlug — same shape as
// publicList's `publicPrice` (generic pricing rules, no shopkeeper override).
const publicGetBySlug = async (request, response, next) => {
  try {
    const product = await db.Product.findOne({
      where: { slug: request.validated.params.slug, status: PRODUCT_STATUSES.ACTIVE },
      include: productInclude,
    });
    if (!product) {
      throw new AppError("Product not found", {
        statusCode: 404,
        code: "PRODUCT_NOT_FOUND",
      });
    }
    const plain = product.toJSON();
    plain.variants = await Promise.all(
      product.variants.map(async (variant) => {
        try {
          const price = await pricingService.calculatePublicPrice({
            variant,
            quantity: variant.minimumOrderQuantity,
          });
          return { ...variant.toJSON(), publicPrice: price.unitPrice.toFixed(4) };
        } catch {
          return { ...variant.toJSON(), publicPrice: null };
        }
      }),
    );
    response.json(ApiResponse.success({ data: plain }));
  } catch (error) {
    next(error);
  }
};

export const productController = {
  adminList,
  adminGetById,
  adminCreate,
  adminUpdate,
  adminDelete,
  adminBulkDelete,
  adminAddImages,
  adminDeleteImage,
  shopkeeperGetBySlug,
  publicGetBySlug,
  shopkeeperList,
  publicList,
};
