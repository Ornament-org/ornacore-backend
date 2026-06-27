import Decimal from "decimal.js";
import { Op } from "sequelize";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { accountsLedgerService } from "../accounts-ledger/accounts-ledger.service.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { pricingService } from "../pricing/pricing.service.js";

export const orderInclude = [
  {
    model: db.ShopkeeperProfile,
    as: "shopkeeper",
    include: [{ model: db.User, as: "user", attributes: ["email", "mobile"] }],
  },
  {
    model: db.StaffProfile,
    as: "assignedStaff",
    required: false,
    include: [{ model: db.User, as: "user", attributes: ["email", "mobile"] }],
  },
  {
    model: db.OrderItem,
    as: "items",
    include: [
      { model: db.Product, as: "product" },
      { model: db.ProductVariant, as: "variant" },
    ],
  },
  {
    model: db.OrderStatusHistory,
    as: "statusHistory",
    required: false,
  },
  { model: db.Payment, as: "payments", required: false },
  { model: db.Delivery, as: "delivery", required: false },
];

const transitions = {
  REQUESTED: ["PRICE_CONFIRMED", "CONFIRMED", "CANCELLED"],
  PRICE_CONFIRMED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const nextOrderNumber = () =>
  `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

const getOrder = async (id, options = {}) => {
  const order = await db.Order.findByPk(id, { include: orderInclude, ...options });
  if (!order) {
    throw new AppError("Order not found", {
      statusCode: 404,
      code: "ORDER_NOT_FOUND",
    });
  }
  return order;
};

const deductInventory = async (order, request, transaction) => {
  for (const item of order.items) {
    const inventory = await db.Inventory.findOne({
      where: { productVariantId: item.productVariantId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!inventory) {
      throw new AppError(`Inventory missing for ${item.skuSnapshot}`, {
        statusCode: 409,
        code: "INVENTORY_NOT_FOUND",
      });
    }
    const available = new Decimal(inventory.onHandQuantity)
      .minus(inventory.reservedQuantity)
      .minus(inventory.damagedQuantity);
    const quantity = new Decimal(item.quantity);
    if (available.lt(quantity)) {
      throw new AppError(`Insufficient stock for ${item.skuSnapshot}`, {
        statusCode: 409,
        code: "INSUFFICIENT_STOCK",
      });
    }
    const balance = new Decimal(inventory.onHandQuantity).minus(quantity);
    await inventory.update({ onHandQuantity: balance.toFixed(3) }, { transaction });
    await db.InventoryMovement.create(
      {
        inventoryId: inventory.id,
        movementType: "STOCK_OUT",
        quantity: quantity.toFixed(3),
        balanceAfter: balance.toFixed(3),
        referenceType: "ORDER",
        referenceId: order.id,
        reason: "Order confirmed",
        createdByUserId: request.auth.sub,
      },
      { transaction },
    );
  }
};

const restoreInventory = async (order, request, transaction) => {
  for (const item of order.items) {
    const inventory = await db.Inventory.findOne({
      where: { productVariantId: item.productVariantId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!inventory) continue;
    const quantity = new Decimal(item.quantity);
    const balance = new Decimal(inventory.onHandQuantity).plus(quantity);
    await inventory.update({ onHandQuantity: balance.toFixed(3) }, { transaction });
    await db.InventoryMovement.create(
      {
        inventoryId: inventory.id,
        movementType: "RETURNED",
        quantity: quantity.toFixed(3),
        balanceAfter: balance.toFixed(3),
        referenceType: "ORDER",
        referenceId: order.id,
        reason: "Order cancelled - stock restored",
        createdByUserId: request.auth.sub,
      },
      { transaction },
    );
  }
};

const postSaleJournal = async (order, request, transaction) => {
  const receivable = await accountsLedgerService.ensureShopkeeperAccount(
    order.shopkeeper,
    transaction,
  );
  const revenue = await accountsLedgerService.getSystemAccount("SALES_REVENUE", transaction);
  await accountsLedgerService.postJournal({
    description: `Sale ${order.orderNumber}`,
    sourceType: "ORDER",
    sourceId: order.id,
    postedByUserId: request.auth.sub,
    transaction,
    lines: [
      {
        ledgerAccountId: receivable.id,
        side: "DEBIT",
        amount: order.grandTotal,
      },
      {
        ledgerAccountId: revenue.id,
        side: "CREDIT",
        amount: order.grandTotal,
      },
    ],
  });
};

const adminList = async (request, response) => {
  try {
    const { page, pageSize, search, status, paymentStatus, assignedStaffId } =
      request.validated.query;
    const where = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (assignedStaffId) where.assignedStaffId = assignedStaffId;
    if (search) where.orderNumber = { [Op.like]: `%${search}%` };
    const { rows, count } = await db.Order.findAndCountAll({
      where,
      include: orderInclude,
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
    response.json(ApiResponse.success({ data: await getOrder(request.validated.params.id) }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const adminCreate = async (request, response) => {
  try {
    const input = request.validated.body;
    const order = await db.sequelize.transaction(async (transaction) => {
      const shopkeeper = await db.ShopkeeperProfile.findByPk(input.shopkeeperId, {
        transaction,
      });
      if (!shopkeeper || shopkeeper.status !== "APPROVED" || !shopkeeper.isOrderAllowed) {
        throw new AppError("Shopkeeper is not approved for ordering", {
          statusCode: 409,
          code: "SHOPKEEPER_ORDER_NOT_ALLOWED",
        });
      }
      let subtotal = new Decimal(0);
      const lines = [];

      for (const inputItem of input.items) {
        const variant = await db.ProductVariant.findByPk(inputItem.productVariantId, {
          include: [{ model: db.Product, as: "product" }],
          transaction,
        });
        if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") {
          throw new AppError("Product variant is unavailable", {
            statusCode: 409,
            code: "PRODUCT_UNAVAILABLE",
          });
        }
        if (new Decimal(inputItem.quantity).lt(variant.minimumOrderQuantity)) {
          throw new AppError(`MOQ for ${variant.sku} is ${variant.minimumOrderQuantity}`, {
            statusCode: 422,
            code: "MOQ_NOT_MET",
          });
        }
        const price = await pricingService.calculateVariantPrice({
          shopkeeper,
          variant,
          quantity: inputItem.quantity,
          transaction,
        });
        const lineTotal = price.unitPrice.mul(inputItem.quantity);
        subtotal = subtotal.plus(lineTotal);
        lines.push({
          productId: variant.productId,
          productVariantId: variant.id,
          productNameSnapshot: variant.product.name,
          skuSnapshot: variant.sku,
          quantity: new Decimal(inputItem.quantity).toFixed(3),
          unitPrice: price.unitPrice.toFixed(4),
          lineSubtotal: lineTotal.toFixed(4),
          discountAmount: "0.0000",
          taxAmount: "0.0000",
          lineTotal: lineTotal.toFixed(4),
          pricingSnapshot: price.snapshot,
          taxSnapshot: null,
        });
      }

      const created = await db.Order.create(
        {
          orderNumber: nextOrderNumber(),
          shopkeeperId: shopkeeper.id,
          placedByUserId: request.auth.sub,
          assignedStaffId: input.assignedStaffId ?? null,
          status: ORDER_STATUSES.REQUESTED,
          paymentStatus: PAYMENT_STATUSES.UNPAID,
          currency: "INR",
          subtotal: subtotal.toFixed(4),
          discountTotal: "0.0000",
          taxTotal: "0.0000",
          grandTotal: subtotal.toFixed(4),
          pricingSnapshot: { calculatedAt: new Date().toISOString() },
          taxSnapshot: null,
          notes: input.notes ?? null,
        },
        { transaction },
      );
      await db.OrderItem.bulkCreate(
        lines.map((line) => ({ ...line, orderId: created.id })),
        { transaction },
      );
      await db.OrderStatusHistory.create(
        {
          orderId: created.id,
          fromStatus: null,
          toStatus: ORDER_STATUSES.REQUESTED,
          note: "Order created by admin",
          changedByUserId: request.auth.sub,
        },
        { transaction },
      );
      return created;
    });
    response.status(201).json(
      ApiResponse.success({
        message: "Order created successfully",
        data: await getOrder(order.id),
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

const adminUpdateStatus = async (request, response) => {
  try {
    const input = request.validated.body;
    const result = await db.sequelize.transaction(async (transaction) => {
      const order = await db.Order.findByPk(request.validated.params.id, {
        include: orderInclude,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) {
        throw new AppError("Order not found", {
          statusCode: 404,
          code: "ORDER_NOT_FOUND",
        });
      }
      if (!transitions[order.status].includes(input.status)) {
        throw new AppError(`Cannot move order from ${order.status} to ${input.status}`, {
          statusCode: 409,
          code: "INVALID_ORDER_TRANSITION",
        });
      }

      const oldStatus = order.status;
      if (input.status === ORDER_STATUSES.CONFIRMED) {
        await deductInventory(order, request, transaction);
        await postSaleJournal(order, request, transaction);
      }
      if (
        input.status === ORDER_STATUSES.CANCELLED &&
        [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.PACKED].includes(oldStatus)
      ) {
        await restoreInventory(order, request, transaction);
        const receivable = await accountsLedgerService.ensureShopkeeperAccount(
          order.shopkeeper,
          transaction,
        );
        const revenue = await accountsLedgerService.getSystemAccount("SALES_REVENUE", transaction);
        await accountsLedgerService.postJournal({
          description: `Cancellation ${order.orderNumber}`,
          sourceType: "ORDER_CANCEL",
          sourceId: order.id,
          postedByUserId: request.auth.sub,
          transaction,
          lines: [
            { ledgerAccountId: revenue.id, side: "DEBIT", amount: order.grandTotal },
            { ledgerAccountId: receivable.id, side: "CREDIT", amount: order.grandTotal },
          ],
        });
      }

      await order.update(
        {
          status: input.status,
          ...(input.status === ORDER_STATUSES.CONFIRMED ? { confirmedAt: new Date() } : {}),
          ...(input.status === ORDER_STATUSES.DELIVERED ? { deliveredAt: new Date() } : {}),
          ...(input.status === ORDER_STATUSES.CANCELLED ? { cancelledAt: new Date() } : {}),
        },
        { transaction },
      );
      await db.OrderStatusHistory.create(
        {
          orderId: order.id,
          fromStatus: oldStatus,
          toStatus: input.status,
          note: input.note ?? null,
          changedByUserId: request.auth.sub,
        },
        { transaction },
      );
      if (input.status === ORDER_STATUSES.DISPATCHED) {
        await db.Delivery.findOrCreate({
          where: { orderId: order.id },
          defaults: {
            status: "DISPATCHED",
            dispatchedAt: new Date(),
          },
          transaction,
        });
      }
      if (input.status === ORDER_STATUSES.DELIVERED) {
        await db.Delivery.update(
          { status: "DELIVERED", deliveredAt: new Date() },
          { where: { orderId: order.id }, transaction },
        );
      }
      await auditLogService.record({
        request,
        action: "UPDATE_STATUS",
        module: "orders",
        entityType: "Order",
        entityId: order.id,
        oldValue: { status: oldStatus },
        newValue: { status: input.status },
        transaction,
      });
      return order;
    });
    response.json(
      ApiResponse.success({
        message: `Order status updated to ${result.status}`,
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

const adminAssign = async (request, response) => {
  try {
    const order = await db.Order.findByPk(request.validated.params.id);
    if (!order) {
      throw new AppError("Order not found", {
        statusCode: 404,
        code: "ORDER_NOT_FOUND",
      });
    }
    await order.update({ assignedStaffId: request.validated.body.assignedStaffId });
    response.json(
      ApiResponse.success({
        message: "Order assigned successfully",
        data: order,
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

const shopkeeperList = async (request, response) => {
  try {
    const { page, pageSize, status } = request.validated.query;
    const where = { shopkeeperId: request.shopkeeper.id };
    if (status) where.status = status;
    const { rows, count } = await db.Order.findAndCountAll({
      where,
      include: orderInclude,
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

const shopkeeperGetById = async (request, response) => {
  try {
    const order = await db.Order.findOne({
      where: {
        id: request.validated.params.id,
        shopkeeperId: request.shopkeeper.id,
      },
      include: orderInclude,
    });
    if (!order) {
      throw new AppError("Order not found", {
        statusCode: 404,
        code: "ORDER_NOT_FOUND",
      });
    }
    response.json(ApiResponse.success({ data: order }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const shopkeeperCreate = async (request, response) => {
  try {
    const order = await db.sequelize.transaction(async (transaction) => {
      const cart = await db.Cart.findOne({
        where: { shopkeeperId: request.shopkeeper.id, status: "ACTIVE" },
        include: [
          {
            model: db.CartItem,
            as: "items",
            include: [
              {
                model: db.ProductVariant,
                as: "variant",
                include: [
                  { model: db.Product, as: "product" },
                  { model: db.Inventory, as: "inventory", required: false },
                ],
              },
            ],
          },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!cart || !cart.items.length) {
        throw new AppError("Cart is empty", {
          statusCode: 409,
          code: "EMPTY_CART",
        });
      }

      let subtotal = new Decimal(0);
      const items = [];
      for (const cartItem of cart.items) {
        const { variant } = cartItem;
        if (!variant.isActive || variant.product.status !== "ACTIVE") {
          throw new AppError(`SKU ${variant.sku} is unavailable`, {
            statusCode: 409,
            code: "PRODUCT_UNAVAILABLE",
          });
        }
        const available = variant.inventory
          ? new Decimal(variant.inventory.onHandQuantity)
              .minus(variant.inventory.reservedQuantity)
              .minus(variant.inventory.damagedQuantity)
          : new Decimal(0);
        if (available.lt(cartItem.quantity)) {
          throw new AppError(`Insufficient stock for ${variant.sku}`, {
            statusCode: 409,
            code: "INSUFFICIENT_STOCK",
          });
        }
        const price = await pricingService.calculateVariantPrice({
          shopkeeper: request.shopkeeper,
          variant,
          quantity: cartItem.quantity,
          transaction,
        });
        const lineTotal = price.unitPrice.mul(cartItem.quantity);
        subtotal = subtotal.plus(lineTotal);
        items.push({
          productId: variant.productId,
          productVariantId: variant.id,
          productNameSnapshot: variant.product.name,
          skuSnapshot: variant.sku,
          quantity: cartItem.quantity,
          unitPrice: price.unitPrice.toFixed(4),
          lineSubtotal: lineTotal.toFixed(4),
          discountAmount: "0.0000",
          taxAmount: "0.0000",
          lineTotal: lineTotal.toFixed(4),
          pricingSnapshot: price.snapshot,
          taxSnapshot: null,
        });
      }

      const created = await db.Order.create(
        {
          orderNumber: nextOrderNumber(),
          shopkeeperId: request.shopkeeper.id,
          placedByUserId: request.auth.sub,
          status: ORDER_STATUSES.REQUESTED,
          paymentStatus: PAYMENT_STATUSES.UNPAID,
          currency: "INR",
          subtotal: subtotal.toFixed(4),
          discountTotal: "0.0000",
          taxTotal: "0.0000",
          grandTotal: subtotal.toFixed(4),
          pricingSnapshot: { calculatedAt: new Date().toISOString() },
          taxSnapshot: null,
          notes: request.validated.body.notes ?? null,
        },
        { transaction },
      );
      await db.OrderItem.bulkCreate(
        items.map((item) => ({ ...item, orderId: created.id })),
        { transaction },
      );
      await db.OrderStatusHistory.create(
        {
          orderId: created.id,
          fromStatus: null,
          toStatus: ORDER_STATUSES.REQUESTED,
          note: "Order placed by shopkeeper",
          changedByUserId: request.auth.sub,
        },
        { transaction },
      );
      await cart.update({ status: "CONVERTED" }, { transaction });
      return created;
    });
    response.status(201).json(
      ApiResponse.success({
        message: "Order placed successfully",
        data: await getOrder(order.id),
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

export const orderController = {
  adminList,
  adminGetById,
  adminCreate,
  adminUpdateStatus,
  adminAssign,
  shopkeeperList,
  shopkeeperGetById,
  shopkeeperCreate,
};
