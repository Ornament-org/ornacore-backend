import Decimal from "decimal.js";
import { ORDER_STATUSES, PAYMENT_TRANSACTION_STATUSES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { LEDGER_ENTRY_TYPES, LEDGER_TRANSACTION_STATUSES } from "../metal-ledger/ledger.constants.js";
import { metalLedgerService } from "../metal-ledger/ledger.service.js";

const zeroGold = () => ({
  grams: "0.000",
  inrEquivalent: "0.00",
});

const toGold = (value) => ({
  grams: new Decimal(value ?? 0).toFixed(3),
  inrEquivalent: "0.00",
});

const toCreditLimit = (limit) => ({
  id: String(limit.id),
  metalId: String(limit.metalId),
  creditLimitGrams: new Decimal(limit.creditLimitGrams ?? 0).toFixed(3),
  metal: limit.metal
    ? {
        id: String(limit.metal.id),
        code: limit.metal.code,
        name: limit.metal.name,
      }
    : null,
});

const primaryAddress = (profile) =>
  profile.addresses?.find((address) => address.isPrimary) ?? profile.addresses?.[0] ?? null;

const getShopkeeper = async (id) => {
  const profile = await db.ShopkeeperProfile.findByPk(id, {
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "email", "mobile", "status", "createdAt", "lastLoginAt"],
      },
      { model: db.ShopkeeperAddress, as: "addresses", required: false },
      {
        model: db.ShopkeeperMetalCreditLimit,
        as: "metalCreditLimits",
        required: false,
        include: [{ model: db.Metal, as: "metal", required: false }],
      },
    ],
  });
  if (!profile) {
    throw new AppError("Shopkeeper not found", {
      statusCode: 404,
      code: "SHOPKEEPER_NOT_FOUND",
    });
  }
  return profile;
};

const summarizeGold = async (shopkeeperId, creditLimits = []) => {
  const summary = await metalLedgerService.getShopLedgerSummary({ shopkeeperId });
  const gold = summary.find((row) => row.code === "GOLD") ?? summary[0];
  const primaryCreditLimit =
    creditLimits.find((limit) => String(limit.metalId) === String(gold?.metalId)) ?? creditLimits[0];
  const creditLimitGrams = new Decimal(primaryCreditLimit?.creditLimitGrams ?? 0);
  const dueGrams = new Decimal(gold?.due ?? 0);
  return {
    primaryMetal: gold
      ? { metalId: gold.metalId, code: gold.code, name: gold.name }
      : { metalId: null, code: "GOLD", name: "Gold" },
    totalGoldDue: gold ? toGold(gold.due) : zeroGold(),
    totalGoldDelivered: gold ? toGold(gold.delivered) : zeroGold(),
    totalGoldReceived: gold ? toGold(gold.received) : zeroGold(),
    outstandingGold: gold ? toGold(gold.due) : zeroGold(),
    overdueGold: gold ? toGold(gold.due) : zeroGold(),
    notDueGold: zeroGold(),
    creditLimit: toGold(creditLimitGrams),
    creditRemaining: toGold(Decimal.max(creditLimitGrams.minus(dueGrams), 0)),
    creditUtilized: gold ? toGold(Decimal.min(dueGrams, creditLimitGrams)) : zeroGold(),
    allMetals: summary,
    creditLimits: creditLimits.map(toCreditLimit),
  };
};

const orderStats = async (shopkeeperId) => {
  const orders = await db.Order.findAll({ where: { shopkeeperId } });
  return {
    totalOrders: orders.length,
    deliveredOrders: orders.filter((order) => order.status === ORDER_STATUSES.DELIVERED).length,
    pendingOrders: orders.filter((order) =>
      ![ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED].includes(order.status),
    ).length,
    cancelledOrders: orders.filter((order) => order.status === ORDER_STATUSES.CANCELLED).length,
  };
};

const ledgerStats = async (shopkeeperId) => {
  const entries = await db.LedgerEntry.findAll({
    include: [
      {
        model: db.LedgerTransaction,
        as: "transaction",
        where: { shopkeeperId, status: LEDGER_TRANSACTION_STATUSES.POSTED },
        required: true,
      },
      { model: db.Metal, as: "metal" },
    ],
  });
  const onlyGoldEntries = entries.filter((entry) => entry.metal?.code === "GOLD");
  const goldEntries = onlyGoldEntries.length ? onlyGoldEntries : entries;
  const debit = goldEntries
    .filter((entry) => [LEDGER_ENTRY_TYPES.DELIVERY, LEDGER_ENTRY_TYPES.ADJUSTMENT].includes(entry.entryType))
    .reduce((sum, entry) => sum.plus(entry.quantity), new Decimal(0));
  const credit = goldEntries
    .filter((entry) => [LEDGER_ENTRY_TYPES.RECEIPT, LEDGER_ENTRY_TYPES.RETURN].includes(entry.entryType))
    .reduce((sum, entry) => sum.plus(entry.quantity), new Decimal(0));
  const lastReceipt = goldEntries
    .filter((entry) => [LEDGER_ENTRY_TYPES.RECEIPT, LEDGER_ENTRY_TYPES.RETURN].includes(entry.entryType))
    .sort((a, b) => new Date(b.transaction.transactionDate) - new Date(a.transaction.transactionDate))[0];
  const lastDelivery = goldEntries
    .filter((entry) => [LEDGER_ENTRY_TYPES.DELIVERY, LEDGER_ENTRY_TYPES.ADJUSTMENT].includes(entry.entryType))
    .sort((a, b) => new Date(b.transaction.transactionDate) - new Date(a.transaction.transactionDate))[0];

  return {
    totalDebitGold: toGold(debit),
    totalCreditGold: toGold(credit),
    currentOutstandingGold: toGold(debit.minus(credit)),
    lastPaymentReceived: lastReceipt
      ? {
          date: lastReceipt.transaction.transactionDate,
          quantity: toGold(lastReceipt.quantity),
        }
      : null,
    lastDeliveryDone: lastDelivery
      ? {
          date: lastDelivery.transaction.transactionDate,
          quantity: toGold(lastDelivery.quantity),
        }
      : null,
  };
};

const recentActivity = async (shopkeeperId) => {
  const [orders, payments, ledgerTransactions] = await Promise.all([
    db.Order.findAll({
      where: { shopkeeperId },
      order: [["createdAt", "DESC"]],
      limit: 10,
    }),
    db.Payment.findAll({
      where: { shopkeeperId },
      order: [["createdAt", "DESC"]],
      limit: 10,
    }),
    db.LedgerTransaction.findAll({
      where: { shopkeeperId },
      include: [{ model: db.LedgerEntry, as: "entries", include: [{ model: db.Metal, as: "metal" }] }],
      order: [["createdAt", "DESC"]],
      limit: 10,
    }),
  ]);

  return [
    ...orders.map((order) => ({
      id: `order-${order.id}`,
      type: order.status === ORDER_STATUSES.DELIVERED ? "ORDER_DELIVERED" : "ORDER_PLACED",
      title: order.status === ORDER_STATUSES.DELIVERED ? "Order delivered" : "New order placed",
      description: `Order #${order.orderNumber} ${order.status.toLowerCase().replaceAll("_", " ")}`,
      occurredAt: order.updatedAt ?? order.createdAt,
    })),
    ...payments
      .filter((payment) => payment.status === PAYMENT_TRANSACTION_STATUSES.COMPLETED)
      .map((payment) => ({
        id: `payment-${payment.id}`,
        type: "GOLD_RECEIVED",
        title: "Payment received",
        description: `${payment.amount} received via ${payment.method.replaceAll("_", " ")}`,
        occurredAt: payment.receivedAt ?? payment.createdAt,
      })),
    ...ledgerTransactions.map((transaction) => ({
      id: `ledger-${transaction.id}`,
      type: "LEDGER_ENTRY_ADDED",
      title: "Ledger entry added",
      description: `${transaction.entries.length} metal ledger entr${transaction.entries.length === 1 ? "y" : "ies"} posted`,
      occurredAt: transaction.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    .slice(0, 10);
};

export const shopkeeperDetailsService = {
  async getDetails(id) {
    const profile = await getShopkeeper(id);
    const address = primaryAddress(profile);
    const creditLimits = profile.metalCreditLimits ?? [];
    const gold = await summarizeGold(profile.id, creditLimits);
    return {
      id: String(profile.id),
      shopkeeperId: `SHP-${String(profile.id).padStart(6, "0")}`,
      memberSince: profile.createdAt,
      status: profile.status,
      creditLimits: creditLimits.map(toCreditLimit),
      shop: {
        shopName: profile.shopName,
        businessType: profile.businessType,
        gstNumber: profile.gstNumber,
        panNumber: null,
        registrationDate: profile.createdAt,
        status: profile.status,
      },
      owner: {
        ownerName: profile.ownerName,
        mobile: profile.user?.mobile ?? null,
        email: profile.user?.email ?? null,
        alternateMobile: null,
      },
      address: {
        addressLine1: profile.addressLine1 ?? address?.addressLine1 ?? null,
        addressLine2: profile.addressLine2 ?? address?.addressLine2 ?? null,
        city: profile.city ?? address?.city ?? null,
        state: profile.state ?? address?.state ?? null,
        pincode: profile.pincode ?? address?.pincode ?? null,
        country: address?.country ?? "India",
        latitude: profile.latitude,
        longitude: profile.longitude,
      },
      gold,
    };
  },

  async getAnalytics(id) {
    const profile = await getShopkeeper(id);
    const [gold, orders, ledger] = await Promise.all([
      summarizeGold(id, profile.metalCreditLimits ?? []),
      orderStats(id),
      ledgerStats(id),
    ]);
    return {
      gold: {
        totalGoldDue: gold.totalGoldDue,
        overdueGold: gold.overdueGold,
        goldDelivered: gold.totalGoldDelivered,
        goldReceived: gold.totalGoldReceived,
        outstandingGold: gold.outstandingGold,
        creditUtilized: gold.creditUtilized,
        creditRemaining: gold.creditRemaining,
        creditLimit: gold.creditLimit,
        creditLimits: gold.creditLimits,
      },
      orders,
      ledger,
    };
  },

  async getOrdersSummary(id) {
    await getShopkeeper(id);
    return orderStats(id);
  },

  async getLedgerSummary(id) {
    await getShopkeeper(id);
    return ledgerStats(id);
  },

  async getRecentActivity(id) {
    await getShopkeeper(id);
    return recentActivity(id);
  },
};
