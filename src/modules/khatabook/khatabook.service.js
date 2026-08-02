import Decimal from "decimal.js";
import { Op } from "sequelize";
import { sequelize } from "../../config/database.js";
import db from "../../database/models/InitializeModels.js";
import { ORDER_STATUSES } from "../../constants/app.constants.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
  KHATABOOK_ADJUSTMENT_TYPES,
  KHATABOOK_COLLECTION_TYPES,
  KHATABOOK_LEDGER_ENTRY_TYPES,
} from "./khatabook.constants.js";
import { khatabookRepository } from "./khatabook.repository.js";
import { khatabookSettlementEngine } from "./khatabookSettlementEngine.js";

const d = (value = 0) => new Decimal(value ?? 0);
const q = (value) => d(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toFixed(3);
const money = (value) => d(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
const accountDate = (value = new Date()) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  return new Date(value);
};
const mapMetal = (metal) => ({
  id: Number(metal.id),
  code: metal.code,
  name: metal.name,
  description: metal.description,
  rateUnit: metal.rateUnit ?? "PER_10G",
});

const mapItem = (item) => ({
  id: Number(item.id),
  itemName: item.itemName,
  grossWeight: q(item.grossWeight),
  tunch: q(item.tunch),
  fineWeight: q(item.fineWeight),
});

const mapCollection = (collection) => ({
  id: Number(collection.id),
  collectionType: collection.collectionType,
  receivedQuantity: collection.receivedQuantity == null ? null : q(collection.receivedQuantity),
  cashAmount: collection.cashAmount == null ? null : money(collection.cashAmount),
  metalRate: collection.metalRate == null ? null : money(collection.metalRate),
  fineCredit: q(collection.fineCredit),
  collectionDate: collection.collectionDate,
  notes: collection.notes,
  settlements: (collection.settlements ?? []).map((settlement) => ({
    orderId: Number(settlement.khatabookOrderId),
    appliedFine: q(settlement.appliedFine),
  })),
});

const mapSourceOrder = (order) => ({
  id: Number(order.id),
  orderNumber: order.orderNumber,
  status: order.status,
  createdAt: order.createdAt,
});

const displayOrderNumber = (order) => {
  const sourceOrders = order.sourceOrders ?? [];
  if (sourceOrders.length === 1) return sourceOrders[0].orderNumber;
  return order.orderNumber;
};

const settlementCollectionType = (settlement, order) =>
  String(settlement.collection?.sourceOrderId ?? "") === String(order.id)
    ? "ORDER_CREATION"
    : "LATER_COLLECTION";

const mapSettlement = (settlement, order) => {
  const col = settlement.collection;
  const appliedFine = d(settlement.appliedFine);
  const metalRate = col?.metalRate ? d(col.metalRate) : null;
  return {
    id: Number(settlement.id),
    collectionId: Number(settlement.collectionId),
    orderId: Number(settlement.khatabookOrderId),
    appliedFine: q(settlement.appliedFine),
    source: settlementCollectionType(settlement, order),
    collectionDate: col?.collectionDate ?? null,
    collectionType: col?.collectionType ?? null,
    sourceOrderId: col?.sourceOrderId ? Number(col.sourceOrderId) : null,
    // Full collection context so UI can show rate/amount
    metalRate: metalRate ? money(metalRate) : null,
    receivedQuantity: col?.receivedQuantity != null ? q(col.receivedQuantity) : null,
    cashAmount: col?.cashAmount != null ? money(col.cashAmount) : null,
    totalFineCredit: col?.fineCredit != null ? q(col.fineCredit) : null,
    // For cash: proportional cash that covered THIS appliedFine portion
    // appliedCash = appliedFine × (metalRate / 10)
    appliedCash:
      col?.collectionType === KHATABOOK_COLLECTION_TYPES.CASH && metalRate
        ? money(appliedFine.times(metalRate).div(10))
        : null,
  };
};

const buildOrderCollectionSummary = (order) => {
  const creationCollectionIds = new Set((order.collections ?? []).map((col) => String(col.id)));
  const settlementRows = order.settlements ?? [];

  const isFromCreation = (s) => creationCollectionIds.has(String(s.collectionId));
  const colType = (s) => s.collection?.collectionType ?? null;
  const appliedCashAmt = (s) => {
    const rate = s.collection?.metalRate ? d(s.collection.metalRate) : null;
    return rate ? d(s.appliedFine).times(rate).div(10) : d(0);
  };

  const sum = (rows, fn) => rows.reduce((acc, s) => acc.plus(fn(s)), d(0));
  const metalRows = settlementRows.filter((s) => colType(s) === KHATABOOK_COLLECTION_TYPES.METAL);
  const cashRows  = settlementRows.filter((s) => colType(s) === KHATABOOK_COLLECTION_TYPES.CASH);

  // Fine applied to this order broken down by metal vs cash collections
  const metalAppliedAtCreation = sum(metalRows.filter(isFromCreation), (s) => d(s.appliedFine));
  const metalAppliedLater      = sum(metalRows.filter((s) => !isFromCreation(s)), (s) => d(s.appliedFine));
  // Cash applied: converted back to INR via appliedFine × rate / 10
  const cashAppliedAtCreation = sum(cashRows.filter(isFromCreation), appliedCashAmt);
  const cashAppliedLater      = sum(cashRows.filter((s) => !isFromCreation(s)), appliedCashAmt);

  return {
    collectionAddedAtOrderCreation: q(
      (order.collections ?? []).reduce((total, col) => total.plus(col.fineCredit), d(0)),
    ),
    collectionAppliedToThisOrder: q(sum(settlementRows, (s) => d(s.appliedFine))),
    collectionAppliedFromCreation: q(sum(settlementRows.filter(isFromCreation), (s) => d(s.appliedFine))),
    collectionAppliedLater: q(sum(settlementRows.filter((s) => !isFromCreation(s)), (s) => d(s.appliedFine))),
    // Metal vs cash breakdown (fine in grams, cash in currency)
    metalAppliedAtCreation: q(metalAppliedAtCreation),
    metalAppliedLater: q(metalAppliedLater),
    cashAppliedAtCreation: money(cashAppliedAtCreation),
    cashAppliedLater: money(cashAppliedLater),
    metalApplied: q(metalAppliedAtCreation.plus(metalAppliedLater)),
    cashApplied: money(cashAppliedAtCreation.plus(cashAppliedLater)),
  };
};

const mapOrder = (order, metalAccount = null) => {
  const collectionSummary = buildOrderCollectionSummary(order);
  const orderDue = q(order.outstandingDue);
  const accountDueBeforeOrder = q(order.previousDue);
  const accountDueAfterOrder = q(order.runningDue);

  return {
    id: Number(order.id),
    orderNumber: displayOrderNumber(order),
    khatabookOrderNumber: order.orderNumber,
    sourceOrders: (order.sourceOrders ?? []).map(mapSourceOrder),
    shopkeeperId: Number(order.shopkeeperId),
    metalId: Number(order.metalId),
    metal: order.metal ? mapMetal(order.metal) : null,
    entryDate: order.entryDate,
    notes: order.notes,
    cashDueAmount: money(order.cashDueAmount ?? 0),
    previousDue: accountDueBeforeOrder,
    fineDelivered: q(order.fineDelivered),
    creditReceived: q(order.creditReceived),
    totalBeforeCollection: q(order.totalBeforeCollection),
    runningDue: accountDueAfterOrder,
    outstandingDue: orderDue,
    orderDue,
    metalDue: metalAccount?.totalOutstandingDue ?? accountDueAfterOrder,
    creditLimit: q(order.creditLimit),
    attemptedDue: q(order.attemptedDue),
    exceededBy: q(order.exceededBy),
    isCreditLimitOverride: Boolean(order.isCreditLimitOverride),
    status: order.status,
    orderSummary: {
      fineDelivered: q(order.fineDelivered),
      collectionAdded: collectionSummary.collectionAddedAtOrderCreation,
      collectionApplied: collectionSummary.collectionAppliedToThisOrder,
      collectionAppliedLater: collectionSummary.collectionAppliedLater,
      outstandingDue: orderDue,
      status: order.status,
    },
    metalAccount: metalAccount ?? {
      totalOutstandingDue: accountDueAfterOrder,
      totalDelivered: q(order.fineDelivered),
      totalReceived: q(order.creditReceived),
      activeOrders: Number(d(order.outstandingDue).gt(0)),
    },
    accountSnapshot: {
      metalDueBeforeOrder: accountDueBeforeOrder,
      metalDueAfterOrder: accountDueAfterOrder,
      creditLimit: q(order.creditLimit),
      attemptedMetalDue: q(order.attemptedDue),
      exceededBy: q(order.exceededBy),
    },
    collectionSummary,
    settlementBreakdown: (order.settlements ?? []).map((settlement) =>
      mapSettlement(settlement, order),
    ),
    items: (order.items ?? []).map(mapItem),
    collections: (order.collections ?? []).map(mapCollection),
  };
};

const mapLedgerEntry = (entry) => ({
  id: Number(entry.id),
  shopkeeperId: Number(entry.shopkeeperId),
  metalId: Number(entry.metalId),
  metal: entry.metal ? mapMetal(entry.metal) : null,
  orderId: entry.khatabookOrderId ? Number(entry.khatabookOrderId) : null,
  orderNumber: entry.order ? displayOrderNumber(entry.order) : null,
  khatabookOrderNumber: entry.order?.orderNumber ?? null,
  sourceOrders: (entry.order?.sourceOrders ?? []).map(mapSourceOrder),
  collectionId: entry.collectionId ? Number(entry.collectionId) : null,
  collectionType: entry.collection?.collectionType ?? null,
  receivedQuantity: entry.collection?.receivedQuantity == null ? null : q(entry.collection.receivedQuantity),
  cashAmount: entry.collection?.cashAmount == null ? null : money(entry.collection.cashAmount),
  metalRate: entry.collection?.metalRate == null ? null : money(entry.collection.metalRate),
  fineCredit: entry.collection?.fineCredit == null ? null : q(entry.collection.fineCredit),
  entryDate: entry.entryDate,
  entryType: entry.entryType,
  debitFine: q(entry.debitFine),
  creditFine: q(entry.creditFine),
  runningBalance: q(entry.runningBalance),
  description: entry.description,
});

const manualMetalDueSum = async ({ shopkeeperId, metalId, transaction }) => {
  const where = { shopkeeperId, adjustmentType: KHATABOOK_ADJUSTMENT_TYPES.METAL_DUE };
  if (metalId) where.metalId = metalId;
  const adjustments = await db.KhatabookAdjustment.findAll({
    where,
    attributes: ["metalId", "dueQuantity"],
    transaction,
  }).catch(() => []);
  return adjustments.reduce((total, adjustment) => total.plus(adjustment.dueQuantity ?? 0), d(0));
};

const ensureShopkeeper = async (shopkeeperId, transaction) => {
  const shopkeeper = await khatabookRepository.findShopkeeper(shopkeeperId, { transaction });
  if (!shopkeeper) {
    throw new AppError("Shopkeeper not found", {
      statusCode: 404,
      code: "SHOPKEEPER_NOT_FOUND",
    });
  }
  return shopkeeper;
};

const ensureMetal = async (metalId, transaction) => {
  const metal = await khatabookRepository.findMetalById(metalId, { transaction });
  if (!metal || !metal.isActive) {
    throw new AppError("Metal not found", { statusCode: 404, code: "METAL_NOT_FOUND" });
  }
  return metal;
};

const getMetalAccountSummary = async (shopkeeperId, metalId, options = {}) => {
  const [orders, collections, manualDue] = await Promise.all([
    db.KhatabookOrder.findAll({
      where: { shopkeeperId, metalId },
      attributes: ["fineDelivered", "outstandingDue"],
      ...options,
    }),
    db.KhatabookCollection.findAll({
      where: { shopkeeperId, metalId },
      attributes: ["fineCredit"],
      ...options,
    }),
    manualMetalDueSum({ shopkeeperId, metalId, transaction: options.transaction }),
  ]);
  const orderOutstanding = orders.reduce((total, order) => total.plus(order.outstandingDue), d(0));
  const totalOutstandingDue = orderOutstanding.plus(manualDue);

  return {
    totalOutstandingDue: q(totalOutstandingDue),
    totalDelivered: q(orders.reduce((total, order) => total.plus(order.fineDelivered), d(0))),
    totalReceived: q(collections.reduce((total, collection) => total.plus(collection.fineCredit), d(0))),
    activeOrders: orders.filter((order) => d(order.outstandingDue).gt(0)).length,
  };
};

const getCustomerSafeLedger = async ({ shopkeeperId, metalId, page = 1, pageSize = 50 }) => {
  const where = {
    shopkeeperId,
    [Op.and]: [
      { orderNumber: { [Op.notLike]: "MDUE-%" } },
      { orderNumber: { [Op.notLike]: "CDUE-%" } },
    ],
  };
  const collectionWhere = { shopkeeperId };
  if (metalId) {
    where.metalId = metalId;
    collectionWhere.metalId = metalId;
  }

  const [orders, collections] = await Promise.all([
    db.KhatabookOrder.findAll({
      where,
      include: [
        { model: db.Metal, as: "metal" },
        {
          model: db.Order,
          as: "sourceOrders",
          required: false,
          attributes: ["id", "orderNumber", "status", "createdAt"],
        },
      ],
      order: [
        ["entryDate", "ASC"],
        ["id", "ASC"],
      ],
    }),
    db.KhatabookCollection.findAll({
      where: collectionWhere,
      include: [{ model: db.Metal, as: "metal" }],
      order: [
        ["collectionDate", "ASC"],
        ["id", "ASC"],
      ],
    }),
  ]);

  let runningBalance = d(0);
  const rows = [
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
          id: `order-${event.order.id}`,
          shopkeeperId: Number(event.order.shopkeeperId),
          metalId: Number(event.order.metalId),
          metal: event.order.metal ? mapMetal(event.order.metal) : null,
          orderId: Number(event.order.id),
          orderNumber: displayOrderNumber(event.order),
          khatabookOrderNumber: event.order.orderNumber,
          sourceOrders: (event.order.sourceOrders ?? []).map(mapSourceOrder),
          collectionId: null,
          collectionType: null,
          receivedQuantity: null,
          cashAmount: null,
          metalRate: null,
          fineCredit: null,
          entryDate: event.date,
          entryType: KHATABOOK_LEDGER_ENTRY_TYPES.DELIVERY,
          debitFine: q(event.order.fineDelivered),
          creditFine: q(0),
          runningBalance: q(runningBalance),
          description: `${event.order.orderNumber} delivery`,
        };
      }

      runningBalance = Decimal.max(0, runningBalance.minus(event.collection.fineCredit));
      return {
        id: `collection-${event.collection.id}`,
        shopkeeperId: Number(event.collection.shopkeeperId),
        metalId: Number(event.collection.metalId),
        metal: event.collection.metal ? mapMetal(event.collection.metal) : null,
        orderId: null,
        orderNumber: null,
        khatabookOrderNumber: null,
        sourceOrders: [],
        collectionId: Number(event.collection.id),
        collectionType: event.collection.collectionType,
        receivedQuantity: event.collection.receivedQuantity == null ? null : q(event.collection.receivedQuantity),
        cashAmount: event.collection.cashAmount == null ? null : money(event.collection.cashAmount),
        metalRate: event.collection.metalRate == null ? null : money(event.collection.metalRate),
        fineCredit: q(event.collection.fineCredit),
        entryDate: event.date,
        entryType:
          event.collection.collectionType === KHATABOOK_COLLECTION_TYPES.CASH
            ? KHATABOOK_LEDGER_ENTRY_TYPES.CASH_CONVERSION
            : KHATABOOK_LEDGER_ENTRY_TYPES.METAL_COLLECTION,
        debitFine: q(0),
        creditFine: q(event.collection.fineCredit),
        runningBalance: q(runningBalance),
        description:
          event.collection.collectionType === KHATABOOK_COLLECTION_TYPES.CASH
            ? "Cash collection converted to metal"
            : "Direct metal collection",
      };
    })
    .reverse();

  const offset = (page - 1) * pageSize;
  return {
    data: rows.slice(offset, offset + pageSize),
    meta: { page, pageSize, totalItems: rows.length, totalPages: Math.ceil(rows.length / pageSize) },
  };
};

const rebuildAdminLedgerForRead = async ({ shopkeeperId, metalId }) => {
  const ids = new Set();
  if (metalId) {
    ids.add(Number(metalId));
  } else {
    const [orders, collections, adjustments] = await Promise.all([
      db.KhatabookOrder.findAll({
        where: {
          shopkeeperId,
          [Op.and]: [
            { orderNumber: { [Op.notLike]: "MDUE-%" } },
            { orderNumber: { [Op.notLike]: "CDUE-%" } },
          ],
        },
        attributes: ["metalId"],
        group: ["metalId"],
      }),
      db.KhatabookCollection.findAll({
        where: { shopkeeperId },
        attributes: ["metalId"],
        group: ["metalId"],
      }),
      db.KhatabookAdjustment.findAll({
        where: { shopkeeperId },
        attributes: ["metalId"],
        group: ["metalId"],
      }).catch(() => []),
    ]);
    [...orders, ...collections, ...adjustments].forEach((row) => ids.add(Number(row.metalId)));
  }

  for (const id of ids) {
    await sequelize.transaction((transaction) =>
      khatabookSettlementEngine.settleOutstandingDuesService({
        shopkeeperId,
        metalId: id,
        transaction,
      }),
    );
  }
};

const loadSourceOrdersForFulfillment = async ({ payload, transaction }) => {
  const sourceOrderIds = [...new Set(payload.sourceOrderIds ?? [])];
  if (!sourceOrderIds.length) return [];
  if (sourceOrderIds.length > 1) {
    throw new AppError("Pull one shop order into a toolbox delivery at a time", {
      statusCode: 422,
      code: "MULTIPLE_SOURCE_ORDERS_NOT_ALLOWED",
    });
  }

  const sourceOrders = await db.Order.findAll({
    where: {
      id: sourceOrderIds,
      shopkeeperId: payload.shopkeeperId,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const byId = new Map(sourceOrders.map((order) => [String(order.id), order]));
  const orderedSourceOrders = sourceOrderIds.map((orderId) => byId.get(String(orderId))).filter(Boolean);

  if (orderedSourceOrders.length !== sourceOrderIds.length) {
    throw new AppError("One or more source orders were not found for this shopkeeper", {
      statusCode: 404,
      code: "SOURCE_ORDER_NOT_FOUND",
    });
  }

  const alreadyClosed = orderedSourceOrders.find((order) =>
    [ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED].includes(order.status),
  );
  if (alreadyClosed) {
    throw new AppError(`Order ${alreadyClosed.orderNumber} is already ${alreadyClosed.status.toLowerCase()}`, {
      statusCode: 409,
      code: "SOURCE_ORDER_ALREADY_CLOSED",
    });
  }

  const alreadyFulfilled = orderedSourceOrders.find((order) => order.fulfilledByKhatabookOrderId);
  if (alreadyFulfilled) {
    throw new AppError(`Order ${alreadyFulfilled.orderNumber} has already been pulled into toolbox`, {
      statusCode: 409,
      code: "SOURCE_ORDER_ALREADY_FULFILLED",
    });
  }

  return orderedSourceOrders;
};

// A shopkeeper's web-placed order can be handed over physically as part of a
// khatabook delivery. Linking it here marks it DELIVERED so it stops showing
// as pending, without re-running catalog inventory/accounts-ledger side effects
// that belong to the normal admin order-status flow — the khatabook order is
// already the source of truth for the metal ledger movement.
const fulfillSourceOrders = async ({ khatabookOrder, sourceOrders, request, transaction }) => {
  for (const sourceOrder of sourceOrders) {
    const fromStatus = sourceOrder.status;
    await sourceOrder.update(
      {
        status: ORDER_STATUSES.DELIVERED,
        deliveredAt: new Date(),
        fulfilledByKhatabookOrderId: khatabookOrder.id,
      },
      { transaction },
    );
    await db.OrderStatusHistory.create(
      {
        orderId: sourceOrder.id,
        fromStatus,
        toStatus: ORDER_STATUSES.DELIVERED,
        note: `Fulfilled via toolbox delivery ${sourceOrder.orderNumber}`,
        changedByUserId: request?.auth?.sub ?? null,
      },
      { transaction },
    );
    const [delivery] = await db.Delivery.findOrCreate({
      where: { orderId: sourceOrder.id },
      defaults: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
      transaction,
    });
    await delivery.update({ status: "DELIVERED", deliveredAt: new Date() }, { transaction });
  }
};

export const khatabookService = {
  async previewOrder(payload) {
    return khatabookSettlementEngine.previewOrder(payload);
  },

  async getShopkeeperKhatabook(shopkeeperId) {
    const [shopkeeper, metals] = await Promise.all([
      ensureShopkeeper(shopkeeperId),
      this.getShopkeeperMetals(shopkeeperId),
    ]);
    return {
      shopkeeper: {
        id: Number(shopkeeper.id),
        shopName: shopkeeper.shopName,
        ownerName: shopkeeper.ownerName,
        status: shopkeeper.status,
        memberSince: shopkeeper.createdAt,
      },
      metals,
    };
  },

  async getShopkeeperMetals(shopkeeperId) {
    const [shopkeeper, metals] = await Promise.all([
      ensureShopkeeper(shopkeeperId),
      khatabookRepository.findActiveMetals(),
    ]);
    const creditByMetal = new Map(
      (shopkeeper.metalCreditLimits ?? []).map((limit) => [
        String(limit.metalId),
        { creditLimitGrams: q(limit.creditLimitGrams), advanceBalance: q(limit.advanceBalance ?? 0) },
      ]),
    );

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [orders, collections, monthlyOrders, monthlyCollections, manualAdjustments] = await Promise.all([
      db.KhatabookOrder.findAll({ where: { shopkeeperId } }),
      db.KhatabookCollection.findAll({ where: { shopkeeperId } }),
      db.KhatabookOrder.findAll({ where: { shopkeeperId, entryDate: { [Op.gte]: monthStart } } }),
      db.KhatabookCollection.findAll({ where: { shopkeeperId, collectionDate: { [Op.gte]: monthStart } } }),
      db.KhatabookAdjustment.findAll({
        where: { shopkeeperId, adjustmentType: KHATABOOK_ADJUSTMENT_TYPES.METAL_DUE },
      }).catch(() => []),
    ]);

    const accumulate = (rows, getKey, getValue) => {
      const map = new Map();
      for (const row of rows) {
        const key = getKey(row);
        map.set(key, (map.get(key) ?? d(0)).plus(getValue(row)));
      }
      return map;
    };

    const totalDelivered  = accumulate(orders,      (o) => String(o.metalId), (o) => d(o.fineDelivered));
    const totalDue        = accumulate(orders,      (o) => String(o.metalId), (o) => d(o.outstandingDue));
    const totalReceived   = accumulate(collections, (c) => String(c.metalId), (c) => d(c.fineCredit));
    const manualDue       = accumulate(manualAdjustments, (a) => String(a.metalId), (a) => d(a.dueQuantity));
    const monthDelivered  = accumulate(monthlyOrders,      (o) => String(o.metalId), (o) => d(o.fineDelivered));
    const monthReceived   = accumulate(monthlyCollections, (c) => String(c.metalId), (c) => d(c.fineCredit));

    return metals.map((metal) => {
      const key = String(metal.id);
      const metalLimits   = creditByMetal.get(key);
      const creditLimit   = d(metalLimits?.creditLimitGrams ?? 0);
      const advanceBalance = d(metalLimits?.advanceBalance ?? 0);
      const outstandingDue = (totalDue.get(key) ?? d(0)).plus(manualDue.get(key) ?? d(0));
      return {
        metal: mapMetal(metal),
        creditLimit: q(creditLimit),
        deliveredQuantity: q(totalDelivered.get(key) ?? d(0)),
        receivedQuantity:  q(totalReceived.get(key)  ?? d(0)),
        outstandingDue:    q(outstandingDue),
        currentRunningDue: q(outstandingDue),
        availableCredit:   q(Decimal.max(0, creditLimit.minus(outstandingDue))),
        ledgerBalance:     q(outstandingDue),
        advanceBalance:    q(advanceBalance),
        monthly: {
          delivered: q(monthDelivered.get(key) ?? d(0)),
          received:  q(monthReceived.get(key)  ?? d(0)),
        },
      };
    });
  },

  async listOrders({ shopkeeperId, metalId, search, page = 1, pageSize = 20 }) {
    if (shopkeeperId) await ensureShopkeeper(shopkeeperId);
    if (metalId) await ensureMetal(metalId);
    const { rows, count } = await khatabookRepository.findOrders({
      shopkeeperId,
      metalId,
      search,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    const summaries = new Map();
    for (const row of rows) {
      const key = `${row.shopkeeperId}:${row.metalId}`;
      if (!summaries.has(key)) {
        summaries.set(key, await getMetalAccountSummary(row.shopkeeperId, row.metalId));
      }
    }
    return {
      data: rows.map((row) => mapOrder(row, summaries.get(`${row.shopkeeperId}:${row.metalId}`))),
      meta: { page, pageSize, totalItems: count, totalPages: Math.ceil(count / pageSize) },
    };
  },

  async getOrder(orderId) {
    const order = await khatabookRepository.findOrderById(orderId);
    if (!order) throw new AppError("Khatabook order not found", { statusCode: 404 });
    const metalAccount = await getMetalAccountSummary(order.shopkeeperId, order.metalId);
    return mapOrder(order, metalAccount);
  },

  async getOrderLedger({ orderId, page = 1, pageSize = 50 }) {
    const order = await khatabookRepository.findOrderById(orderId, { include: [] });
    if (!order) throw new AppError("Khatabook order not found", { statusCode: 404 });
    const { rows, count } = await khatabookRepository.findLedger({
      shopkeeperId: order.shopkeeperId,
      metalId: order.metalId,
      orderId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return {
      data: rows.map(mapLedgerEntry),
      meta: { page, pageSize, totalItems: count, totalPages: Math.ceil(count / pageSize) },
    };
  },

  async getShopkeeperLedger({ shopkeeperId, metalId, page = 1, pageSize = 50, includeAdjustments = true }) {
    await ensureShopkeeper(shopkeeperId);
    if (metalId) await ensureMetal(metalId);
    if (!includeAdjustments) {
      return getCustomerSafeLedger({ shopkeeperId, metalId, page, pageSize });
    }
    await rebuildAdminLedgerForRead({ shopkeeperId, metalId });
    const { rows, count } = await khatabookRepository.findLedger({
      shopkeeperId,
      metalId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      includeAdjustments,
    });
    return {
      data: rows.map(mapLedgerEntry),
      meta: { page, pageSize, totalItems: count, totalPages: Math.ceil(count / pageSize) },
    };
  },

  async createOrder({ payload, request }) {
    return sequelize.transaction(async (transaction) => {
      const sourceOrders = await loadSourceOrdersForFulfillment({ payload, transaction });
      const orderNumber =
        sourceOrders.length === 1 ? sourceOrders[0].orderNumber : payload.orderNumber;
      const order = await khatabookSettlementEngine.createOrderService({
        payload: { ...payload, orderNumber },
        request,
        transaction,
      });
      if (sourceOrders.length) {
        await fulfillSourceOrders({
          khatabookOrder: order,
          sourceOrders,
          request,
          transaction,
        });
      }
      const reloadedOrder = await khatabookRepository.findOrderById(order.id, { transaction });
      const metalAccount = await getMetalAccountSummary(order.shopkeeperId, order.metalId, {
        transaction,
      });
      return mapOrder(reloadedOrder, metalAccount);
    });
  },

  async addMetalCollection({ orderId, payload, request }) {
    return this.addCollection({
      orderId,
      payload: {
        collectionType: KHATABOOK_COLLECTION_TYPES.METAL,
        receivedQuantity: payload.receivedQuantity,
        collectionDate: payload.collectionDate,
        notes: payload.notes,
      },
      request,
    });
  },

  async addCashCollection({ orderId, payload, request }) {
    return this.addCollection({
      orderId,
      payload: {
        collectionType: KHATABOOK_COLLECTION_TYPES.CASH,
        cashAmount: payload.cashAmount,
        metalRate: payload.metalRate,
        collectionDate: payload.collectionDate,
        notes: payload.notes,
      },
      request,
    });
  },

  async createAccountMetalCollection({ payload, request }) {
    return this.createAccountCollection({
      payload: {
        ...payload,
        collectionType: KHATABOOK_COLLECTION_TYPES.METAL,
      },
      request,
    });
  },

  async createAccountCashCollection({ payload, request }) {
    return this.createAccountCollection({
      payload: {
        ...payload,
        collectionType: KHATABOOK_COLLECTION_TYPES.CASH,
      },
      request,
    });
  },

  async createAccountMetalDue({ payload, request }) {
    return this.createAccountDue({
      payload: {
        ...payload,
        dueType: "METAL",
      },
      request,
    });
  },

  async createAccountCashDue({ payload, request }) {
    return this.createAccountDue({
      payload: {
        ...payload,
        dueType: "CASH",
      },
      request,
    });
  },

  async createAccountDue({ payload, request }) {
    return sequelize.transaction(async (transaction) => {
      await ensureShopkeeper(payload.shopkeeperId, transaction);
      await ensureMetal(payload.metalId, transaction);

      const isMetalDue = payload.dueType === "METAL";
      const fineDelivered = isMetalDue ? d(payload.dueQuantity) : d(0);
      const cashDueAmount = isMetalDue ? d(0) : d(payload.cashAmount);
      if (fineDelivered.lte(0) && cashDueAmount.lte(0)) {
        throw new AppError("Due amount must be greater than zero", {
          statusCode: 422,
          code: "INVALID_DUE_AMOUNT",
        });
      }

      await db.KhatabookAdjustment.create(
        {
          shopkeeperId: payload.shopkeeperId,
          metalId: payload.metalId,
          adjustmentType: isMetalDue
            ? KHATABOOK_ADJUSTMENT_TYPES.METAL_DUE
            : KHATABOOK_ADJUSTMENT_TYPES.CASH_DUE,
          adjustmentDate: accountDate(payload.entryDate),
          notes: payload.notes ?? null,
          dueQuantity: q(fineDelivered),
          cashAmount: money(cashDueAmount),
          createdByUserId: request?.auth?.sub ?? null,
        },
        { transaction },
      );

      const settlement = await khatabookSettlementEngine.settleOutstandingDuesService({
        shopkeeperId: payload.shopkeeperId,
        metalId: payload.metalId,
        transaction,
      });
      await db.ShopkeeperProfile.update(
        { lastTransactionAt: new Date() },
        { where: { id: payload.shopkeeperId }, transaction },
      );
      return settlement;
    });
  },

  async createAccountCollection({ payload, request }) {
    return sequelize.transaction(async (transaction) => {
      await khatabookSettlementEngine.createCollectionService({
        shopkeeperId: payload.shopkeeperId,
        metalId: payload.metalId,
        collectionType: payload.collectionType,
        receivedQuantity: payload.receivedQuantity,
        cashAmount: payload.cashAmount,
        metalRate: payload.metalRate,
        collectionDate: payload.collectionDate,
        notes: payload.notes,
        request,
        transaction,
      });
      const settlement = await khatabookSettlementEngine.settleOutstandingDuesService({
        shopkeeperId: payload.shopkeeperId,
        metalId: payload.metalId,
        transaction,
      });
      await db.ShopkeeperProfile.update(
        { lastTransactionAt: new Date() },
        { where: { id: payload.shopkeeperId }, transaction },
      );
      return settlement;
    });
  },

  async addCollection({ orderId, payload, request }) {
    return sequelize.transaction(async (transaction) => {
      const order = await khatabookRepository.findOrderById(orderId, { transaction, include: [] });
      if (!order) throw new AppError("Khatabook order not found", { statusCode: 404 });

      await khatabookSettlementEngine.createCollectionService({
        shopkeeperId: order.shopkeeperId,
        metalId: order.metalId,
        collectionType: payload.collectionType,
        receivedQuantity: payload.receivedQuantity,
        cashAmount: payload.cashAmount,
        metalRate: payload.metalRate,
        collectionDate: payload.collectionDate,
        notes: payload.notes,
        request,
        transaction,
      });
      await khatabookSettlementEngine.settleOutstandingDuesService({
        shopkeeperId: order.shopkeeperId,
        metalId: order.metalId,
        transaction,
      });
      await db.ShopkeeperProfile.update(
        { lastTransactionAt: new Date() },
        { where: { id: order.shopkeeperId }, transaction },
      );

      const reloadedOrder = await khatabookRepository.findOrderById(order.id, { transaction });
      const metalAccount = await getMetalAccountSummary(order.shopkeeperId, order.metalId, {
        transaction,
      });
      return mapOrder(reloadedOrder, metalAccount);
    });
  },
};
