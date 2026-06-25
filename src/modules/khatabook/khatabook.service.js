import Decimal from "decimal.js";
import { sequelize } from "../../config/database.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { KHATABOOK_COLLECTION_TYPES } from "./khatabook.constants.js";
import { khatabookRepository } from "./khatabook.repository.js";
import { khatabookSettlementEngine } from "./khatabookSettlementEngine.js";

const d = (value = 0) => new Decimal(value ?? 0);
const q = (value) => d(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toFixed(3);
const money = (value) => d(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
const mapMetal = (metal) => ({
  id: Number(metal.id),
  code: metal.code,
  name: metal.name,
  description: metal.description,
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

const settlementCollectionType = (settlement, order) =>
  String(settlement.collection?.sourceOrderId ?? "") === String(order.id)
    ? "ORDER_CREATION"
    : "LATER_COLLECTION";

const mapSettlement = (settlement, order) => ({
  id: Number(settlement.id),
  collectionId: Number(settlement.collectionId),
  orderId: Number(settlement.khatabookOrderId),
  appliedFine: q(settlement.appliedFine),
  source: settlementCollectionType(settlement, order),
  collectionDate: settlement.collection?.collectionDate ?? null,
  collectionType: settlement.collection?.collectionType ?? null,
  sourceOrderId: settlement.collection?.sourceOrderId
    ? Number(settlement.collection.sourceOrderId)
    : null,
});

const buildOrderCollectionSummary = (order) => {
  const creationCollectionIds = new Set((order.collections ?? []).map((collection) => String(collection.id)));
  const settlementRows = order.settlements ?? [];
  return {
    collectionAddedAtOrderCreation: q(
      (order.collections ?? []).reduce((total, collection) => total.plus(collection.fineCredit), d(0)),
    ),
    collectionAppliedToThisOrder: q(
      settlementRows.reduce((total, settlement) => total.plus(settlement.appliedFine), d(0)),
    ),
    collectionAppliedFromCreation: q(
      settlementRows
        .filter((settlement) => creationCollectionIds.has(String(settlement.collectionId)))
        .reduce((total, settlement) => total.plus(settlement.appliedFine), d(0)),
    ),
    collectionAppliedLater: q(
      settlementRows
        .filter((settlement) => !creationCollectionIds.has(String(settlement.collectionId)))
        .reduce((total, settlement) => total.plus(settlement.appliedFine), d(0)),
    ),
  };
};

const mapOrder = (order, metalAccount = null) => {
  const collectionSummary = buildOrderCollectionSummary(order);
  const orderDue = q(order.outstandingDue);
  const accountDueBeforeOrder = q(order.previousDue);
  const accountDueAfterOrder = q(order.runningDue);

  return {
    id: Number(order.id),
    orderNumber: order.orderNumber,
    shopkeeperId: Number(order.shopkeeperId),
    metalId: Number(order.metalId),
    metal: order.metal ? mapMetal(order.metal) : null,
    entryDate: order.entryDate,
    notes: order.notes,
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
  collectionId: entry.collectionId ? Number(entry.collectionId) : null,
  entryDate: entry.entryDate,
  entryType: entry.entryType,
  debitFine: q(entry.debitFine),
  creditFine: q(entry.creditFine),
  runningBalance: q(entry.runningBalance),
  description: entry.description,
});

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
  const [orders, collections] = await Promise.all([
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
  ]);

  return {
    totalOutstandingDue: q(
      orders.reduce((total, order) => total.plus(order.outstandingDue), d(0)),
    ),
    totalDelivered: q(orders.reduce((total, order) => total.plus(order.fineDelivered), d(0))),
    totalReceived: q(collections.reduce((total, collection) => total.plus(collection.fineCredit), d(0))),
    activeOrders: orders.filter((order) => d(order.outstandingDue).gt(0)).length,
  };
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
        q(limit.creditLimitGrams),
      ]),
    );
    const [orders, collections] = await Promise.all([
      db.KhatabookOrder.findAll({ where: { shopkeeperId } }),
      db.KhatabookCollection.findAll({ where: { shopkeeperId } }),
    ]);
    const totals = new Map();
    for (const order of orders) {
      const key = String(order.metalId);
      const current = totals.get(key) ?? { delivered: d(0), received: d(0), due: d(0) };
      current.delivered = current.delivered.plus(order.fineDelivered);
      current.due = current.due.plus(order.outstandingDue);
      totals.set(key, current);
    }
    for (const collection of collections) {
      const key = String(collection.metalId);
      const current = totals.get(key) ?? { delivered: d(0), received: d(0), due: d(0) };
      current.received = current.received.plus(collection.fineCredit);
      totals.set(key, current);
    }
    return metals.map((metal) => {
      const total = totals.get(String(metal.id)) ?? { delivered: d(0), received: d(0), due: d(0) };
      const creditLimit = d(creditByMetal.get(String(metal.id)) ?? 0);
      const outstandingDue = d(total.due);
      return {
        metal: mapMetal(metal),
        creditLimit: q(creditLimit),
        deliveredQuantity: q(total.delivered),
        receivedQuantity: q(total.received),
        outstandingDue: q(outstandingDue),
        currentRunningDue: q(outstandingDue),
        availableCredit: q(Decimal.max(0, creditLimit.minus(outstandingDue))),
        ledgerBalance: q(outstandingDue),
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

  async createOrder({ payload, request }) {
    return sequelize.transaction(async (transaction) => {
      const order = await khatabookSettlementEngine.createOrderService({
        payload,
        request,
        transaction,
      });
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
