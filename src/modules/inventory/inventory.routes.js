import Decimal from "decimal.js";
import { z } from "zod";
import { PERMISSIONS } from "../../constants/permissions.js";
import db from "../../database/models/InitializeModels.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../shared/errors/AppError.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { createModuleRouter } from "../module.router.js";

export const inventoryAdminRouter = createModuleRouter();

const adjustmentSchema = z.object({
  body: z.object({
    movementType: z.enum([
      "STOCK_IN",
      "STOCK_OUT",
      "ADJUSTMENT",
      "RESERVATION",
      "RESERVATION_RELEASE",
      "DAMAGED",
      "RETURNED",
    ]),
    quantity: z.coerce.number().nonnegative(),
    reason: z.string().trim().min(3).max(500),
    referenceType: z.string().trim().max(100).nullable().optional(),
    referenceId: z.coerce.number().int().positive().nullable().optional(),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

const inventoryInclude = [
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

inventoryAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.INVENTORY_VIEW),
  validate(listQuerySchema),
  asyncHandler(async (request, response) => {
    const { page, pageSize } = request.validated.query;
    const { rows, count } = await db.Inventory.findAndCountAll({
      include: inventoryInclude,
      order: [["updatedAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
    });
    const data = rows.map((record) => ({
      ...record.toJSON(),
      availableQuantity: new Decimal(record.onHandQuantity)
        .minus(record.reservedQuantity)
        .minus(record.damagedQuantity)
        .toFixed(3),
      stockStatus: new Decimal(record.onHandQuantity).lte(0)
        ? "OUT_OF_STOCK"
        : new Decimal(record.onHandQuantity).lte(record.reorderLevel)
          ? "LOW_STOCK"
          : "IN_STOCK",
    }));
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
  }),
);

inventoryAdminRouter.get(
  "/movements",
  ...protectAdmin(PERMISSIONS.INVENTORY_VIEW),
  validate(listQuerySchema),
  asyncHandler(async (request, response) => {
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
  }),
);

inventoryAdminRouter.get(
  "/:id",
  ...protectAdmin(PERMISSIONS.INVENTORY_VIEW),
  validate(idParamSchema),
  asyncHandler(async (request, response) => {
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
  }),
);

inventoryAdminRouter.post(
  "/:id/adjust",
  ...protectAdmin(PERMISSIONS.INVENTORY_UPDATE),
  validate(adjustmentSchema),
  asyncHandler(async (request, response) => {
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
      return inventory;
    });
    response.json(
      ApiResponse.success({
        message: "Inventory adjusted successfully",
        data: updated,
      }),
    );
  }),
);
