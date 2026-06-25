import Decimal from "decimal.js";
import { z } from "zod";
import {
  ACTOR_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYMENT_TRANSACTION_STATUSES,
} from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import db from "../../database/models/InitializeModels.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../shared/errors/AppError.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { accountsLedgerService } from "../accounts-ledger/accounts-ledger.service.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { createModuleRouter } from "../module.router.js";

export const paymentAdminRouter = createModuleRouter();
export const paymentShopkeeperRouter = createModuleRouter();

const nextPaymentNumber = () =>
  `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

const paymentSchema = z.object({
  body: z.object({
    orderId: z.coerce.number().int().positive().nullable().optional(),
    shopkeeperId: z.coerce.number().int().positive(),
    method: z.enum(Object.values(PAYMENT_METHODS)),
    amount: z.coerce.number().positive(),
    externalReference: z.string().trim().max(191).nullable().optional(),
    receivedAt: z.coerce.date().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const statusSchema = z.object({
  body: z.object({
    status: z.enum(Object.values(PAYMENT_TRANSACTION_STATUSES)),
    notes: z.string().trim().max(5000).nullable().optional(),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

const paymentInclude = [
  { model: db.Order, as: "order", required: false },
  {
    model: db.ShopkeeperProfile,
    as: "shopkeeper",
    include: [{ model: db.User, as: "user", attributes: ["email", "mobile"] }],
  },
];

const updateOrderPaymentStatus = async (orderId, transaction) => {
  if (!orderId) return;
  const order = await db.Order.findByPk(orderId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!order) return;
  const payments = await db.Payment.findAll({
    where: { orderId, status: PAYMENT_TRANSACTION_STATUSES.COMPLETED },
    transaction,
  });
  const paid = payments.reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
  const total = new Decimal(order.grandTotal);
  const status = paid.lte(0)
    ? PAYMENT_STATUSES.UNPAID
    : paid.greaterThanOrEqualTo(total)
      ? PAYMENT_STATUSES.PAID
      : PAYMENT_STATUSES.PARTIALLY_PAID;
  await order.update({ paymentStatus: status }, { transaction });
};

paymentAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.PAYMENT_VIEW),
  validate(listQuerySchema),
  asyncHandler(async (request, response) => {
    const { page, pageSize, shopkeeperId, orderId, method, status } = request.validated.query;
    const where = {};
    if (shopkeeperId) where.shopkeeperId = shopkeeperId;
    if (orderId) where.orderId = orderId;
    if (method) where.method = method;
    if (status) where.status = status;
    const { rows, count } = await db.Payment.findAndCountAll({
      where,
      include: paymentInclude,
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

paymentAdminRouter.get(
  "/due",
  ...protectAdmin(PERMISSIONS.PAYMENT_VIEW),
  asyncHandler(async (_request, response) => {
    const shopkeepers = await db.ShopkeeperProfile.findAll({
      include: [{ model: db.User, as: "user", attributes: ["email", "mobile"] }],
      order: [["shopName", "ASC"]],
    });
    const data = await Promise.all(
      shopkeepers.map(async (shopkeeper) => {
        const totalPurchase =
          (await db.Order.sum("grandTotal", {
            where: {
              shopkeeperId: shopkeeper.id,
              status: ["CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED"],
            },
          })) || 0;
        const totalPaid =
          (await db.Payment.sum("amount", {
            where: {
              shopkeeperId: shopkeeper.id,
              status: PAYMENT_TRANSACTION_STATUSES.COMPLETED,
            },
          })) || 0;
        return {
          ...shopkeeper.toJSON(),
          totalPurchase: Number(totalPurchase).toFixed(2),
          totalPaid: Number(totalPaid).toFixed(2),
          totalDue: await accountsLedgerService.shopkeeperBalance(shopkeeper.id),
        };
      }),
    );
    response.json(ApiResponse.success({ data }));
  }),
);

paymentAdminRouter.get(
  "/:id",
  ...protectAdmin(PERMISSIONS.PAYMENT_VIEW),
  validate(idParamSchema),
  asyncHandler(async (request, response) => {
    const payment = await db.Payment.findByPk(request.validated.params.id, {
      include: paymentInclude,
    });
    if (!payment) {
      throw new AppError("Payment not found", {
        statusCode: 404,
        code: "PAYMENT_NOT_FOUND",
      });
    }
    response.json(ApiResponse.success({ data: payment }));
  }),
);

paymentAdminRouter.post(
  "/",
  ...protectAdmin(PERMISSIONS.PAYMENT_UPDATE_STATUS),
  validate(paymentSchema),
  asyncHandler(async (request, response) => {
    const input = request.validated.body;
    const payment = await db.sequelize.transaction(async (transaction) => {
      const shopkeeper = await db.ShopkeeperProfile.findByPk(input.shopkeeperId, {
        transaction,
      });
      if (!shopkeeper) {
        throw new AppError("Shopkeeper not found", {
          statusCode: 404,
          code: "SHOPKEEPER_NOT_FOUND",
        });
      }
      if (input.orderId) {
        const order = await db.Order.findOne({
          where: { id: input.orderId, shopkeeperId: shopkeeper.id },
          transaction,
        });
        if (!order) {
          throw new AppError("Order does not belong to the selected shopkeeper", {
            statusCode: 422,
            code: "PAYMENT_ORDER_MISMATCH",
          });
        }
      }
      const created = await db.Payment.create(
        {
          paymentNumber: nextPaymentNumber(),
          orderId: input.orderId ?? null,
          shopkeeperId: shopkeeper.id,
          method: input.method,
          status: PAYMENT_TRANSACTION_STATUSES.COMPLETED,
          amount: new Decimal(input.amount).toFixed(4),
          currency: "INR",
          externalReference: input.externalReference ?? null,
          receivedAt: input.receivedAt ?? new Date(),
          recordedByUserId: request.auth.sub,
          notes: input.notes ?? null,
          metadata: input.metadata ?? null,
        },
        { transaction },
      );
      const receivable = await accountsLedgerService.ensureShopkeeperAccount(
        shopkeeper,
        transaction,
      );
      const debitAccount = await accountsLedgerService.getSystemAccount(
        input.method === PAYMENT_METHODS.CASH
          ? "CASH"
          : input.method === PAYMENT_METHODS.CREDIT
            ? "PAYMENT_ADJUSTMENTS"
            : "BANK",
        transaction,
      );
      await accountsLedgerService.postJournal({
        description: `Payment ${created.paymentNumber}`,
        sourceType: "PAYMENT",
        sourceId: created.id,
        postedByUserId: request.auth.sub,
        transaction,
        lines: [
          { ledgerAccountId: debitAccount.id, side: "DEBIT", amount: created.amount },
          { ledgerAccountId: receivable.id, side: "CREDIT", amount: created.amount },
        ],
      });
      await updateOrderPaymentStatus(input.orderId, transaction);
      await auditLogService.record({
        request,
        action: "CREATE",
        module: "payments",
        entityType: "Payment",
        entityId: created.id,
        newValue: created,
        transaction,
      });
      return created;
    });
    response.status(201).json(
      ApiResponse.success({
        message: "Payment recorded successfully",
        data: payment,
      }),
    );
  }),
);

paymentAdminRouter.patch(
  "/:id/status",
  ...protectAdmin(PERMISSIONS.PAYMENT_UPDATE_STATUS),
  validate(statusSchema),
  asyncHandler(async (request, response) => {
    const payment = await db.Payment.findByPk(request.validated.params.id);
    if (!payment) {
      throw new AppError("Payment not found", {
        statusCode: 404,
        code: "PAYMENT_NOT_FOUND",
      });
    }
    const transitions = {
      PENDING: ["COMPLETED", "FAILED", "VOIDED"],
      COMPLETED: ["REFUNDED"],
      FAILED: [],
      REFUNDED: [],
      VOIDED: [],
    };
    const nextStatus = request.validated.body.status;
    if (!transitions[payment.status].includes(nextStatus)) {
      throw new AppError(`Cannot move payment from ${payment.status} to ${nextStatus}`, {
        statusCode: 409,
        code: "INVALID_PAYMENT_TRANSITION",
      });
    }
    await db.sequelize.transaction(async (transaction) => {
      if (
        payment.status === PAYMENT_TRANSACTION_STATUSES.COMPLETED &&
        nextStatus === PAYMENT_TRANSACTION_STATUSES.REFUNDED
      ) {
        const shopkeeper = await db.ShopkeeperProfile.findByPk(payment.shopkeeperId, {
          transaction,
        });
        const receivable = await accountsLedgerService.ensureShopkeeperAccount(
          shopkeeper,
          transaction,
        );
        const creditAccount = await accountsLedgerService.getSystemAccount(
          payment.method === PAYMENT_METHODS.CASH
            ? "CASH"
            : payment.method === PAYMENT_METHODS.CREDIT
              ? "PAYMENT_ADJUSTMENTS"
              : "BANK",
          transaction,
        );
        await accountsLedgerService.postJournal({
          description: `Refund ${payment.paymentNumber}`,
          sourceType: "PAYMENT_REFUND",
          sourceId: payment.id,
          postedByUserId: request.auth.sub,
          transaction,
          lines: [
            { ledgerAccountId: receivable.id, side: "DEBIT", amount: payment.amount },
            { ledgerAccountId: creditAccount.id, side: "CREDIT", amount: payment.amount },
          ],
        });
      }
      await payment.update(request.validated.body, { transaction });
      await updateOrderPaymentStatus(payment.orderId, transaction);
    });
    response.json(
      ApiResponse.success({
        message: `Payment status updated to ${payment.status}`,
        data: payment,
      }),
    );
  }),
);

paymentShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);
paymentShopkeeperRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const payments = await db.Payment.findAll({
      where: { shopkeeperId: request.shopkeeper.id },
      include: [{ model: db.Order, as: "order", required: false }],
      order: [["createdAt", "DESC"]],
    });
    response.json(ApiResponse.success({ data: payments }));
  }),
);
