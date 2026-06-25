import Decimal from "decimal.js";
import { sequelize } from "../../config/database.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { BALANCE_DIRECTIONS, LEDGER_ENTRY_TYPES, LEDGER_TRANSACTION_STATUSES } from "./ledger.constants.js";
import { decimalString, mapSummaryRow, mapTransaction } from "./ledger.mapper.js";
import { ledgerRepository } from "./ledger.repository.js";

const nextTransactionNo = () =>
  `ML-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

const ensureShopkeeper = async (shopkeeperId, transaction) => {
  const shopkeeper = await ledgerRepository.findShopkeeper(shopkeeperId, { transaction });
  if (!shopkeeper) {
    throw new AppError("Shopkeeper not found", {
      statusCode: 404,
      code: "SHOPKEEPER_NOT_FOUND",
    });
  }
  return shopkeeper;
};

const normalizeDateOnly = (date = new Date()) => new Date(date).toISOString().slice(0, 10);

const entryBalanceEffect = (entry) =>
  new Decimal(entry.quantity).times(BALANCE_DIRECTIONS[entry.entryType] ?? 0);

const summarizeEntries = (entries) => {
  const byMetal = new Map();
  for (const entry of entries) {
    const key = String(entry.metalId);
    const current = byMetal.get(key) ?? {
      metal: entry.metal,
      delivered: new Decimal(0),
      received: new Decimal(0),
      due: new Decimal(0),
    };
    const quantity = new Decimal(entry.quantity);
    if ([LEDGER_ENTRY_TYPES.DELIVERY, LEDGER_ENTRY_TYPES.ADJUSTMENT].includes(entry.entryType)) {
      current.delivered = current.delivered.plus(quantity);
    }
    if ([LEDGER_ENTRY_TYPES.RECEIPT, LEDGER_ENTRY_TYPES.RETURN].includes(entry.entryType)) {
      current.received = current.received.plus(quantity);
    }
    current.due = current.due.plus(entryBalanceEffect(entry));
    byMetal.set(key, current);
  }
  return [...byMetal.values()].map(mapSummaryRow);
};

export const metalLedgerService = {
  async createTransaction({ shopkeeperId, transactionDate, remarks, entries, actorUserId }) {
    return sequelize.transaction(async (transaction) => {
      await ensureShopkeeper(shopkeeperId, transaction);
      const ledgerTransaction = await db.LedgerTransaction.create(
        {
          shopkeeperId,
          transactionNo: nextTransactionNo(),
          transactionDate: normalizeDateOnly(transactionDate),
          remarks: remarks ?? null,
          createdByUserId: actorUserId ?? null,
          updatedByUserId: actorUserId ?? null,
        },
        { transaction },
      );
      await db.LedgerEntry.bulkCreate(
        entries.map((entry) => ({
          ledgerTransactionId: ledgerTransaction.id,
          entryType: entry.entryType,
          metalId: entry.metalId,
          quantity: decimalString(entry.quantity),
          rate: entry.rate == null ? null : decimalString(entry.rate, 4),
          amount: entry.amount == null ? null : decimalString(entry.amount, 4),
          remarks: entry.remarks ?? null,
        })),
        { transaction },
      );
      await db.ShopkeeperProfile.update(
        { lastTransactionAt: new Date() },
        { where: { id: shopkeeperId }, transaction },
      );
      return this.getTransactionById(ledgerTransaction.id, { transaction });
    });
  },

  async getTransactionById(id, options = {}) {
    const transaction = await ledgerRepository.findTransactionById(id, options);
    if (!transaction) {
      throw new AppError("Ledger transaction not found", {
        statusCode: 404,
        code: "LEDGER_TRANSACTION_NOT_FOUND",
      });
    }
    return mapTransaction(transaction);
  },

  async updateTransaction({ id, payload, actorUserId }) {
    return sequelize.transaction(async (transaction) => {
      const existing = await ledgerRepository.findTransactionById(id, { transaction });
      if (!existing) {
        throw new AppError("Ledger transaction not found", {
          statusCode: 404,
          code: "LEDGER_TRANSACTION_NOT_FOUND",
        });
      }
      if (existing.status === LEDGER_TRANSACTION_STATUSES.VOID) {
        throw new AppError("Voided transactions cannot be updated", {
          statusCode: 409,
          code: "LEDGER_TRANSACTION_VOID",
        });
      }
      await existing.update(
        {
          transactionDate: payload.transactionDate
            ? normalizeDateOnly(payload.transactionDate)
            : existing.transactionDate,
          remarks: payload.remarks ?? existing.remarks,
          updatedByUserId: actorUserId ?? null,
        },
        { transaction },
      );
      return this.getTransactionById(existing.id, { transaction });
    });
  },

  async voidTransaction({ id, reason, actorUserId }) {
    return sequelize.transaction(async (transaction) => {
      const existing = await ledgerRepository.findTransactionById(id, { transaction });
      if (!existing) {
        throw new AppError("Ledger transaction not found", {
          statusCode: 404,
          code: "LEDGER_TRANSACTION_NOT_FOUND",
        });
      }
      if (existing.status === LEDGER_TRANSACTION_STATUSES.VOID) {
        return mapTransaction(existing);
      }
      await existing.update(
        {
          status: LEDGER_TRANSACTION_STATUSES.VOID,
          voidReason: reason,
          voidedAt: new Date(),
          voidedByUserId: actorUserId ?? null,
          updatedByUserId: actorUserId ?? null,
        },
        { transaction },
      );
      return this.getTransactionById(existing.id, { transaction });
    });
  },

  async getShopLedgerSummary({ shopkeeperId, metalId }) {
    await ensureShopkeeper(shopkeeperId);
    const entries = await ledgerRepository.findPostedEntries({ shopkeeperId, metalId });
    return summarizeEntries(entries);
  },

  async calculateShopBalance(shopkeeperId, metalId) {
    const summary = await this.getShopLedgerSummary({ shopkeeperId, metalId });
    return summary.reduce((total, row) => total.plus(row.due), new Decimal(0)).toFixed(3);
  },

  async getShopTransactionHistory({ shopkeeperId, metalId, from, to, page, pageSize }) {
    await ensureShopkeeper(shopkeeperId);
    const { rows, count } = await ledgerRepository.findTransactions({
      shopkeeperId,
      metalId,
      from: from ? normalizeDateOnly(from) : undefined,
      to: to ? normalizeDateOnly(to) : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return {
      data: rows.map(mapTransaction),
      meta: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  },

  async getRunningBalanceTimeline({ shopkeeperId, metalId, from, to, page, pageSize }) {
    await ensureShopkeeper(shopkeeperId);
    const allTransactions = await ledgerRepository.findTransactions({
      shopkeeperId,
      metalId,
      from: from ? normalizeDateOnly(from) : undefined,
      to: to ? normalizeDateOnly(to) : undefined,
    });
    const runningByMetal = new Map();
    const chronological = [...allTransactions.rows]
      .sort((a, b) => {
        const dateCompare = String(a.transactionDate).localeCompare(String(b.transactionDate));
        return dateCompare || Number(a.id) - Number(b.id);
      })
      .map(mapTransaction)
      .map((transaction) => {
        for (const entry of transaction.entries) {
          const key = String(entry.metalId);
          const current = runningByMetal.get(key) ?? new Decimal(0);
          const next = current.plus(
            new Decimal(entry.quantity).times(BALANCE_DIRECTIONS[entry.entryType] ?? 0),
          );
          runningByMetal.set(key, next);
        }
        return {
          ...transaction,
          runningDue: Object.fromEntries(
            [...runningByMetal.entries()].map(([key, value]) => [key, value.toFixed(3)]),
          ),
        };
      });
    const descending = chronological.reverse();
    const offset = (page - 1) * pageSize;
    return {
      data: descending.slice(offset, offset + pageSize),
      meta: {
        page,
        pageSize,
        totalItems: descending.length,
        totalPages: Math.ceil(descending.length / pageSize),
      },
    };
  },
};
