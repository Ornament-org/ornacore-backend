import Decimal from "decimal.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import {
  KHATABOOK_COLLECTION_TYPES,
  KHATABOOK_LEDGER_ENTRY_TYPES,
  KHATABOOK_ORDER_STATUSES,
} from "./khatabook.constants.js";

const d = (value = 0) => new Decimal(value ?? 0);
const gm = (value) => d(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toFixed(3);
const money = (value) => d(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
const normalizeDate = (date = new Date()) => new Date(date);

const nextOrderNumber = () =>
  `KH-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

const ensureShopkeeper = async (shopkeeperId, transaction) => {
  const shopkeeper = await db.ShopkeeperProfile.findByPk(shopkeeperId, { transaction });
  if (!shopkeeper) {
    throw new AppError("Shopkeeper not found", {
      statusCode: 404,
      code: "SHOPKEEPER_NOT_FOUND",
    });
  }
  return shopkeeper;
};

const ensureMetal = async (metalId, transaction) => {
  const metal = await db.Metal.findByPk(metalId, { transaction });
  if (!metal || !metal.isActive) {
    throw new AppError("Metal not found", {
      statusCode: 404,
      code: "METAL_NOT_FOUND",
    });
  }
  return metal;
};

const orderStatus = (fineDelivered, outstandingDue) => {
  if (d(outstandingDue).lte(0)) return KHATABOOK_ORDER_STATUSES.SETTLED;
  if (d(outstandingDue).eq(fineDelivered)) return KHATABOOK_ORDER_STATUSES.UNSETTLED;
  return KHATABOOK_ORDER_STATUSES.PARTIALLY_SETTLED;
};

const mapDraft = (draft) => ({
  currentDue: gm(draft.metalCurrentDue),
  metalCurrentDue: gm(draft.metalCurrentDue),
  creditLimit: gm(draft.creditLimit),
  availableCredit: gm(draft.availableCredit),
  items: draft.items.map((item, index) => ({
    id: index + 1,
    itemName: item.itemName,
    grossWeight: gm(item.grossWeight),
    tunch: gm(item.tunch),
    fineWeight: gm(item.fineWeight),
  })),
  fineDelivered: gm(draft.fineDelivered),
  collectionCredit: gm(draft.collectionCredit),
  cashConvertedFine: gm(draft.cashConvertedFine),
  orderDue: gm(draft.orderDue),
  metalDue: gm(draft.metalProjectedDue),
  totalBeforeCollection: gm(draft.metalCurrentDue.plus(draft.fineDelivered)),
  attemptedDue: gm(draft.metalProjectedDue),
  exceededBy: gm(draft.exceededBy),
  creditLimitExceeded: draft.exceededBy.gt(0),
});

export const khatabookSettlementEngine = {
  // KMSE key guard: every engine operation is scoped to one Shopkeeper + Metal account.
  async assertEngineAccount({ shopkeeperId, metalId, transaction }) {
    await ensureShopkeeper(shopkeeperId, transaction);
    await ensureMetal(metalId, transaction);
    return { shopkeeperId, metalId };
  },

  // Fine weight always belongs in the backend: gross weight * tunch / 100.
  calculateItemFineWeight({ grossWeight, tunch }) {
    return d(grossWeight).times(tunch).div(100);
  },

  // Cash rate is entered as amount per 10 gm, so converted gm = cash / rate * 10.
  convertCashToMetalService({ cashAmount, metalRate }) {
    if (!cashAmount || !metalRate) return d(0);
    return d(cashAmount).div(metalRate).times(10);
  },

  // Current outstanding is the sum of order dues for this exact Shopkeeper + Metal pair.
  async calculateOutstandingService({ shopkeeperId, metalId, transaction }) {
    const orders = await db.KhatabookOrder.findAll({
      where: { shopkeeperId, metalId },
      attributes: ["outstandingDue"],
      transaction,
    });
    return orders.reduce((total, order) => total.plus(order.outstandingDue), d(0));
  },

  async getCreditLimit({ shopkeeperId, metalId, transaction }) {
    const limit = await db.ShopkeeperMetalCreditLimit.findOne({
      where: { shopkeeperId, metalId },
      transaction,
    });
    return d(limit?.creditLimitGrams ?? 0);
  },

  // Builds the backend-only order preview used by both validation and the UI preview endpoint.
  async buildOrderDraft({ payload, transaction }) {
    await this.assertEngineAccount({
      shopkeeperId: payload.shopkeeperId,
      metalId: payload.metalId,
      transaction,
    });

    const metalCurrentDue = await this.calculateOutstandingService({
      shopkeeperId: payload.shopkeeperId,
      metalId: payload.metalId,
      transaction,
    });
    const creditLimit = await this.getCreditLimit({
      shopkeeperId: payload.shopkeeperId,
      metalId: payload.metalId,
      transaction,
    });
    const items = payload.items.map((item) => ({
      ...item,
      fineWeight: this.calculateItemFineWeight(item),
    }));
    const fineDelivered = items.reduce((total, item) => total.plus(item.fineWeight), d(0));
    const metalCredit = d(payload.collection?.metalReceived ?? 0);
    const cashConvertedFine = this.convertCashToMetalService({
      cashAmount: payload.collection?.cashReceived,
      metalRate: payload.collection?.metalRate,
    });
    const collectionCredit = metalCredit.plus(cashConvertedFine);
    const orderDue = Decimal.max(0, fineDelivered.minus(collectionCredit));
    const metalProjectedDue = Decimal.max(
      0,
      metalCurrentDue.plus(fineDelivered).minus(collectionCredit),
    );
    const exceededBy = Decimal.max(0, metalProjectedDue.minus(creditLimit));

    return {
      metalCurrentDue,
      creditLimit,
      availableCredit: Decimal.max(0, creditLimit.minus(metalCurrentDue)),
      items,
      fineDelivered,
      metalCredit,
      cashConvertedFine,
      collectionCredit,
      orderDue,
      metalProjectedDue,
      exceededBy,
    };
  },

  async previewOrder(payload) {
    return mapDraft(await this.buildOrderDraft({ payload }));
  },

  // Credit limit validation happens before order creation and considers delivery minus visit collection.
  async validateCreditLimitService({ payload, draft, request }) {
    const isOverride = Boolean(payload.overrideCreditLimit);
    if (draft.exceededBy.lte(0)) return;

    if (isOverride) {
      // Check if user has permission to override credit limit
      const hasPermission =
        request?.auth?.roles?.includes("SUPER_ADMIN") ||
        request?.auth?.permissions?.includes("shopkeeper.credit_limit.update");
      if (!hasPermission) {
        throw new AppError("You do not have permission to override credit limit", {
          statusCode: 403,
          code: "INSUFFICIENT_PERMISSION",
          details: { requiredPermission: "shopkeeper.credit_limit.update" },
        });
      }
    } else {
      throw new AppError(`Credit limit exceeded by ${gm(draft.exceededBy)} gm. Order cannot be created.`, {
        statusCode: 409,
        code: "CREDIT_LIMIT_EXCEEDED",
        details: {
          shopkeeperId: payload.shopkeeperId,
          metalId: payload.metalId,
          creditLimit: gm(draft.creditLimit),
          metalCurrentDue: gm(draft.metalCurrentDue),
          deliveryFine: gm(draft.fineDelivered),
          collectionCredit: gm(draft.collectionCredit),
          orderDue: gm(draft.orderDue),
          attemptedDue: gm(draft.metalProjectedDue),
          exceededBy: gm(draft.exceededBy),
        },
      });
    }

    // Override ON means validation passes; audit is written after the order id exists.
  },

  // Collections are account-level credits. They are not assigned to an order at creation time.
  async createCollectionService({
    shopkeeperId,
    metalId,
    collectionType,
    receivedQuantity,
    cashAmount,
    metalRate,
    collectionDate,
    notes,
    sourceOrderId = null,
    request,
    transaction,
  }) {
    await this.assertEngineAccount({ shopkeeperId, metalId, transaction });

    const fineCredit =
      collectionType === KHATABOOK_COLLECTION_TYPES.CASH
        ? this.convertCashToMetalService({ cashAmount, metalRate })
        : d(receivedQuantity ?? 0);

    if (fineCredit.lte(0)) {
      throw new AppError("Collection credit must be greater than zero", {
        statusCode: 422,
        code: "INVALID_COLLECTION_CREDIT",
      });
    }

    return db.KhatabookCollection.create(
      {
        sourceOrderId,
        shopkeeperId,
        metalId,
        collectionType,
        receivedQuantity:
          collectionType === KHATABOOK_COLLECTION_TYPES.METAL ? gm(receivedQuantity) : null,
        cashAmount: collectionType === KHATABOOK_COLLECTION_TYPES.CASH ? money(cashAmount) : null,
        metalRate: collectionType === KHATABOOK_COLLECTION_TYPES.CASH ? money(metalRate) : null,
        fineCredit: gm(fineCredit),
        collectionDate: normalizeDate(collectionDate),
        notes: notes ?? null,
        createdByUserId: request?.auth?.sub ?? null,
      },
      { transaction },
    );
  },

  // Order creation writes delivery first, then optional visit collections, then reruns FIFO settlement.
  async createOrderService({ payload, request, transaction }) {
    const draft = await this.buildOrderDraft({ payload, transaction });
    await this.validateCreditLimitService({ payload, draft, request });

    const order = await db.KhatabookOrder.create(
      {
        orderNumber: payload.orderNumber ?? nextOrderNumber(),
        shopkeeperId: payload.shopkeeperId,
        metalId: payload.metalId,
        entryDate: normalizeDate(payload.entryDate),
        notes: payload.notes ?? null,
        fineDelivered: gm(draft.fineDelivered),
        outstandingDue: gm(draft.fineDelivered),
        creditLimit: gm(draft.creditLimit),
        attemptedDue: gm(draft.metalProjectedDue),
        exceededBy: gm(draft.exceededBy),
        isCreditLimitOverride: Boolean(payload.overrideCreditLimit),
        createdByUserId: request?.auth?.sub ?? null,
        updatedByUserId: request?.auth?.sub ?? null,
      },
      { transaction },
    );

    await db.KhatabookOrderItem.bulkCreate(
      draft.items.map((item) => ({
        khatabookOrderId: order.id,
        itemName: item.itemName,
        grossWeight: gm(item.grossWeight),
        tunch: gm(item.tunch),
        fineWeight: gm(item.fineWeight),
      })),
      { transaction },
    );

    if (draft.exceededBy.gt(0) && payload.overrideCreditLimit) {
      // The audit entry stores the exact credit-limit breach approved by the admin.
      await auditLogService.record({
        request,
        action: "CREDIT_LIMIT_OVERRIDE",
        module: "khatabook",
        entityType: "KhatabookOrder",
        entityId: order.id,
        newValue: {
          action: "CREDIT_LIMIT_OVERRIDE",
          shopkeeperId: payload.shopkeeperId,
          metalId: payload.metalId,
          creditLimit: gm(draft.creditLimit),
          projectedDue: gm(draft.metalProjectedDue),
          exceededBy: gm(draft.exceededBy),
          createdBy: request?.auth?.sub ?? null,
        },
        transaction,
      });
    }

    if (draft.metalCredit.gt(0)) {
      await this.createCollectionService({
        shopkeeperId: payload.shopkeeperId,
        metalId: payload.metalId,
        collectionType: KHATABOOK_COLLECTION_TYPES.METAL,
        receivedQuantity: draft.metalCredit,
        collectionDate: payload.entryDate,
        notes: payload.collection?.notes,
        sourceOrderId: order.id,
        request,
        transaction,
      });
    }

    if (draft.cashConvertedFine.gt(0)) {
      await this.createCollectionService({
        shopkeeperId: payload.shopkeeperId,
        metalId: payload.metalId,
        collectionType: KHATABOOK_COLLECTION_TYPES.CASH,
        cashAmount: payload.collection.cashReceived,
        metalRate: payload.collection.metalRate,
        collectionDate: payload.entryDate,
        notes: payload.collection?.notes,
        sourceOrderId: order.id,
        request,
        transaction,
      });
    }

    await this.settleOutstandingDuesService({
      shopkeeperId: payload.shopkeeperId,
      metalId: payload.metalId,
      transaction,
    });

    await db.ShopkeeperProfile.update(
      { lastTransactionAt: new Date() },
      { where: { id: payload.shopkeeperId }, transaction },
    );

    return order;
  },

  // FIFO settlement rebuilds all allocations for one account so edits/replays stay deterministic.
  async settleOutstandingDuesService({ shopkeeperId, metalId, transaction }) {
    await this.assertEngineAccount({ shopkeeperId, metalId, transaction });

    const [orders, collections] = await Promise.all([
      db.KhatabookOrder.findAll({
        where: { shopkeeperId, metalId },
        order: [
          ["entryDate", "ASC"],
          ["id", "ASC"],
        ],
        transaction,
      }),
      db.KhatabookCollection.findAll({
        where: { shopkeeperId, metalId },
        order: [
          ["collectionDate", "ASC"],
          ["id", "ASC"],
        ],
        transaction,
      }),
    ]);

    if (collections.length) {
      await db.KhatabookSettlement.destroy({
        where: { collectionId: collections.map((collection) => collection.id) },
        transaction,
      });
    }
    await db.KhatabookLedgerEntry.destroy({ where: { shopkeeperId, metalId }, transaction });

    // FIFO allocation: every collection walks oldest open orders before newer orders.
    const remainingByOrder = new Map(orders.map((order) => [String(order.id), d(order.fineDelivered)]));
    const creditAppliedByOrder = new Map(orders.map((order) => [String(order.id), d(0)]));
    const settlementRows = [];
    let advanceBalance = d(0);

    for (const collection of collections) {
      let remainingCredit = d(collection.fineCredit);
      for (const order of orders) {
        if (remainingCredit.lte(0)) break;
        const key = String(order.id);
        const orderDue = remainingByOrder.get(key) ?? d(0);
        if (orderDue.lte(0)) continue;

        const appliedFine = Decimal.min(orderDue, remainingCredit);
        remainingByOrder.set(key, orderDue.minus(appliedFine));
        creditAppliedByOrder.set(key, (creditAppliedByOrder.get(key) ?? d(0)).plus(appliedFine));
        remainingCredit = remainingCredit.minus(appliedFine);
        settlementRows.push({
          collectionId: collection.id,
          khatabookOrderId: order.id,
          appliedFine: gm(appliedFine),
        });
      }
      // Any credit left after all orders are settled is an advance deposit.
      advanceBalance = advanceBalance.plus(remainingCredit);
    }

    // Persist advance balance so the UI can display it.
    const existing = await db.ShopkeeperMetalCreditLimit.findOne({
      where: { shopkeeperId, metalId },
      transaction,
    });
    if (existing) {
      await existing.update({ advanceBalance: gm(advanceBalance) }, { transaction });
    } else if (advanceBalance.gt(0)) {
      await db.ShopkeeperMetalCreditLimit.create(
        { shopkeeperId, metalId, creditLimitGrams: "0.000", advanceBalance: gm(advanceBalance) },
        { transaction },
      );
    }

    if (settlementRows.length) {
      await db.KhatabookSettlement.bulkCreate(settlementRows, { transaction });
    }

    // Ledger is rebuilt chronologically after allocation so running balances are account-accurate.
    let runningBalance = d(0);
    const ledgerRows = [
      ...orders.map((order) => ({ kind: "ORDER", date: order.entryDate, id: Number(order.id), order })),
      ...collections.map((collection) => ({
        kind: "COLLECTION",
        date: collection.collectionDate,
        id: Number(collection.id),
        collection,
      })),
    ]
      .sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id)
      .map((event) => {
        if (event.kind === "ORDER") {
          runningBalance = runningBalance.plus(event.order.fineDelivered);
          return {
            shopkeeperId,
            metalId,
            khatabookOrderId: event.order.id,
            collectionId: null,
            entryDate: event.date,
            entryType: KHATABOOK_LEDGER_ENTRY_TYPES.DELIVERY,
            debitFine: gm(event.order.fineDelivered),
            creditFine: gm(0),
            runningBalance: gm(runningBalance),
            description: `${event.order.orderNumber} delivery`,
          };
        }

        runningBalance = Decimal.max(0, runningBalance.minus(event.collection.fineCredit));
        return {
          shopkeeperId,
          metalId,
          khatabookOrderId: null,
          collectionId: event.collection.id,
          entryDate: event.date,
          entryType:
            event.collection.collectionType === KHATABOOK_COLLECTION_TYPES.CASH
              ? KHATABOOK_LEDGER_ENTRY_TYPES.CASH_CONVERSION
              : KHATABOOK_LEDGER_ENTRY_TYPES.METAL_COLLECTION,
          debitFine: gm(0),
          creditFine: gm(event.collection.fineCredit),
          runningBalance: gm(runningBalance),
          description:
            event.collection.collectionType === KHATABOOK_COLLECTION_TYPES.CASH
              ? "Cash collection converted to metal"
              : "Direct metal collection",
        };
      });

    if (ledgerRows.length) await db.KhatabookLedgerEntry.bulkCreate(ledgerRows, { transaction });

    // Each order stores its current due, total credit applied by FIFO, and account running due.
    let accountDueBeforeOrder = d(0);
    for (const order of orders) {
      const key = String(order.id);
      const creditReceived = creditAppliedByOrder.get(key) ?? d(0);
      const outstandingDue = remainingByOrder.get(key) ?? d(0);
      const totalBeforeCollection = accountDueBeforeOrder.plus(order.fineDelivered);
      const runningDue = accountDueBeforeOrder.plus(outstandingDue);

      await order.update(
        {
          previousDue: gm(accountDueBeforeOrder),
          creditReceived: gm(creditReceived),
          totalBeforeCollection: gm(totalBeforeCollection),
          runningDue: gm(runningDue),
          outstandingDue: gm(outstandingDue),
          status: orderStatus(order.fineDelivered, outstandingDue),
        },
        { transaction },
      );

      accountDueBeforeOrder = runningDue;
    }

    return {
      shopkeeperId,
      metalId,
      outstandingDue: gm(await this.calculateOutstandingService({ shopkeeperId, metalId, transaction })),
    };
  },
};
