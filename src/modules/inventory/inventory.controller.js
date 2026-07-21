import { Op } from "sequelize";
import Decimal from "decimal.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";

export const inventoryInclude = [
  {
    model: db.ProductVariant,
    as: "variant",
    include: [
      {
        model: db.Product,
        as: "product",
        include: [
          {
            model: db.ProductImage,
            as: "images",
            required: false,
            include: [{ model: db.Media, as: "media", required: false }],
          },
        ],
      },
    ],
  },
];

const decorateInventoryRow = (record) => ({
  ...record,
  availableQuantity: new Decimal(record.onHandQuantity)
    .minus(record.reservedQuantity)
    .minus(record.damagedQuantity)
    .toFixed(3),
  stockStatus: new Decimal(record.onHandQuantity).lte(0)
    ? "OUT_OF_STOCK"
    : new Decimal(record.onHandQuantity).lte(record.reorderLevel)
      ? "LOW_STOCK"
      : "IN_STOCK",
});

// Every active product variant is a stock-keeping unit whether or not an
// Inventory row has ever been created for it — a variant created without an
// opening stock count has none yet. Listing from ProductVariant (rather than
// Inventory) means those variants still show up here, at zero, instead of
// being invisible until someone happens to adjust them once.
const list = async (request, response) => {
  try {
    const { page, pageSize, search } = request.validated.query;
    const where = { isActive: true };
    if (search) {
      where[Op.or] = [
        { sku: { [Op.like]: `%${search}%` } },
        { "$product.name$": { [Op.like]: `%${search}%` } },
      ];
    }
    const { rows, count } = await db.ProductVariant.findAndCountAll({
      where,
      include: [
        {
          model: db.Product,
          as: "product",
          include: [
            {
              model: db.ProductImage,
              as: "images",
              required: false,
              include: [{ model: db.Media, as: "media", required: false }],
            },
          ],
        },
        { model: db.Inventory, as: "inventory", required: false },
      ],
      order: [["updatedAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
      subQuery: false,
    });
    const data = rows.map((variantRow) => {
      const variant = variantRow.toJSON();
      const { inventory, ...variantOnly } = variant;
      const base = {
        id: variant.id,
        productVariantId: variant.id,
        inventoryId: inventory?.id ?? null,
        onHandQuantity: inventory?.onHandQuantity ?? "0.000",
        reservedQuantity: inventory?.reservedQuantity ?? "0.000",
        damagedQuantity: inventory?.damagedQuantity ?? "0.000",
        reorderLevel: inventory?.reorderLevel ?? "0.000",
        variant: variantOnly,
      };
      return decorateInventoryRow(base);
    });
    response.json(
      ApiResponse.success({
        data,
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

const listMovements = async (request, response) => {
  try {
    const { page, pageSize, inventoryId, movementType } = request.validated.query;
    const where = {};
    if (inventoryId) where.inventoryId = inventoryId;
    if (movementType) where.movementType = movementType;
    const { rows, count } = await db.InventoryMovement.findAndCountAll({
      where,
      include: [
        {
          model: db.Inventory,
          as: "inventory",
          include: inventoryInclude,
        },
      ],
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

const getById = async (request, response) => {
  try {
    const inventory = await db.Inventory.findByPk(request.validated.params.id, {
      include: inventoryInclude,
    });
    if (!inventory) {
      throw new AppError("Inventory record not found", {
        statusCode: 404,
        code: "INVENTORY_NOT_FOUND",
      });
    }
    response.json(ApiResponse.success({ data: inventory }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

// Applies one stock movement to an already-locked Inventory row within the
// caller's transaction — shared by both the legacy id-based adjust and the
// variant-based one below so the movement math only lives in one place.
const applyMovement = async ({ inventory, input, request, transaction }) => {
  const oldValue = inventory.toJSON();
  let onHand = new Decimal(inventory.onHandQuantity);
  let reserved = new Decimal(inventory.reservedQuantity);
  let damaged = new Decimal(inventory.damagedQuantity);
  const quantity = new Decimal(input.quantity);
  let movementQuantity = quantity;

  switch (input.movementType) {
    case "STOCK_IN":
    case "RETURNED":
      onHand = onHand.plus(quantity);
      break;
    case "STOCK_OUT":
      if (onHand.minus(reserved).minus(damaged).lt(quantity)) {
        throw new AppError("Insufficient available stock", {
          statusCode: 409,
          code: "INSUFFICIENT_STOCK",
        });
      }
      onHand = onHand.minus(quantity);
      break;
    case "ADJUSTMENT":
      movementQuantity = quantity.minus(onHand);
      onHand = quantity;
      break;
    case "RESERVATION":
      if (onHand.minus(reserved).minus(damaged).lt(quantity)) {
        throw new AppError("Insufficient available stock", {
          statusCode: 409,
          code: "INSUFFICIENT_STOCK",
        });
      }
      reserved = reserved.plus(quantity);
      break;
    case "RESERVATION_RELEASE":
      if (reserved.lt(quantity)) {
        throw new AppError("Reservation release exceeds reserved stock", {
          statusCode: 409,
          code: "INVALID_RESERVATION_RELEASE",
        });
      }
      reserved = reserved.minus(quantity);
      break;
    case "DAMAGED":
      if (onHand.minus(reserved).minus(damaged).lt(quantity)) {
        throw new AppError("Insufficient available stock", {
          statusCode: 409,
          code: "INSUFFICIENT_STOCK",
        });
      }
      damaged = damaged.plus(quantity);
      break;
    default:
      break;
  }

  await inventory.update(
    {
      onHandQuantity: onHand.toFixed(3),
      reservedQuantity: reserved.toFixed(3),
      damagedQuantity: damaged.toFixed(3),
    },
    { transaction },
  );
  await db.InventoryMovement.create(
    {
      inventoryId: inventory.id,
      movementType: input.movementType,
      quantity: movementQuantity.abs().toFixed(3),
      balanceAfter: onHand.toFixed(3),
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      reason: input.reason,
      createdByUserId: request.auth.sub,
    },
    { transaction },
  );
  await auditLogService.record({
    request,
    action: "ADJUST_STOCK",
    module: "inventory",
    entityType: "Inventory",
    entityId: inventory.id,
    oldValue,
    newValue: inventory,
    transaction,
  });
};

/*
  POST /admin/inventory/:id/adjust
  {
    "movementType": "STOCK_IN",
    "quantity": 10,
    "reason": "Supplier delivery",
    "referenceType": "PURCHASE_ORDER",
    "referenceId": 42
  }
  movementType: STOCK_IN | STOCK_OUT | ADJUSTMENT | RESERVATION | RESERVATION_RELEASE | DAMAGED | RETURNED
*/
const adjust = async (request, response) => {
  try {
    const input = request.validated.body;
    const updated = await db.sequelize.transaction(async (transaction) => {
      const inventory = await db.Inventory.findByPk(request.validated.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!inventory) {
        throw new AppError("Inventory record not found", {
          statusCode: 404,
          code: "INVENTORY_NOT_FOUND",
        });
      }
      await applyMovement({ inventory, input, request, transaction });
      return inventory;
    });
    response.json(
      ApiResponse.success({
        message: "Inventory adjusted successfully",
        data: updated,
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
  POST /admin/inventory/variant/:variantId/adjust
  Same body as the id-based adjust above — the Inventory row is created
  (all zeros) on first use, so a variant that's never had stock counted
  can be set directly without a separate "initialize" step.
*/
const adjustByVariant = async (request, response) => {
  try {
    const input = request.validated.body;
    const { variantId } = request.validated.params;
    const updated = await db.sequelize.transaction(async (transaction) => {
      const variant = await db.ProductVariant.findByPk(variantId, { transaction });
      if (!variant) {
        throw new AppError("Product variant not found", {
          statusCode: 404,
          code: "PRODUCT_VARIANT_NOT_FOUND",
        });
      }
      const [inventory] = await db.Inventory.findOrCreate({
        where: { productVariantId: variantId },
        defaults: { productVariantId: variantId },
        transaction,
      });
      // findOrCreate doesn't lock — re-fetch under a row lock so a concurrent
      // adjustment on the same brand-new row can't race past this one.
      const locked = await db.Inventory.findByPk(inventory.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      await applyMovement({ inventory: locked, input, request, transaction });
      return locked;
    });
    response.json(
      ApiResponse.success({
        message: "Inventory adjusted successfully",
        data: updated,
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

export const inventoryController = {
  list,
  listMovements,
  getById,
  adjust,
  adjustByVariant,
};
