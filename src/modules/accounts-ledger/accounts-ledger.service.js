import Decimal from "decimal.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";

const nextNumber = (prefix) =>
  `${prefix}-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

export const accountsLedgerService = {
  async ensureShopkeeperAccount(shopkeeper, transaction) {
    const [account] = await db.LedgerAccount.findOrCreate({
      where: { code: `AR-SHOP-${shopkeeper.id}` },
      defaults: {
        name: `${shopkeeper.shopName} Receivable`,
        accountType: "ASSET",
        ownerType: "SHOPKEEPER",
        shopkeeperId: shopkeeper.id,
        currency: "INR",
        isActive: true,
      },
      transaction,
    });
    return account;
  },

  async getSystemAccount(code, transaction) {
    const account = await db.LedgerAccount.findOne({ where: { code }, transaction });
    if (!account) {
      throw new AppError(`Ledger account ${code} is not configured`, {
        statusCode: 500,
        code: "LEDGER_ACCOUNT_MISSING",
      });
    }
    return account;
  },

  async postJournal({
    description,
    sourceType,
    sourceId,
    lines,
    postedByUserId,
    metadata,
    transaction,
  }) {
    const debit = lines
      .filter((line) => line.side === "DEBIT")
      .reduce((sum, line) => sum.plus(line.amount), new Decimal(0));
    const credit = lines
      .filter((line) => line.side === "CREDIT")
      .reduce((sum, line) => sum.plus(line.amount), new Decimal(0));

    if (lines.length < 2 || !debit.equals(credit) || debit.lte(0)) {
      throw new AppError("Journal entry is not balanced", {
        statusCode: 422,
        code: "UNBALANCED_JOURNAL",
      });
    }

    const existing = await db.JournalEntry.findOne({
      where: { sourceType, sourceId, status: "POSTED" },
      transaction,
    });
    if (existing) return existing;

    const entry = await db.JournalEntry.create(
      {
        entryNumber: nextNumber("JRN"),
        entryDate: new Date(),
        description,
        sourceType,
        sourceId,
        status: "POSTED",
        postedByUserId,
        postedAt: new Date(),
        metadata: metadata ?? null,
      },
      { transaction },
    );
    await db.JournalLine.bulkCreate(
      lines.map((line) => ({
        journalEntryId: entry.id,
        ledgerAccountId: line.ledgerAccountId,
        side: line.side,
        amount: new Decimal(line.amount).toFixed(4),
        memo: line.memo ?? null,
      })),
      { transaction },
    );
    return entry;
  },

  async shopkeeperBalance(shopkeeperId) {
    const account = await db.LedgerAccount.findOne({
      where: { shopkeeperId, accountType: "ASSET" },
    });
    if (!account) return "0.0000";
    const lines = await db.JournalLine.findAll({
      where: { ledgerAccountId: account.id },
      include: [
        {
          model: db.JournalEntry,
          as: "journalEntry",
          where: { status: "POSTED" },
          required: true,
        },
      ],
    });
    return lines
      .reduce(
        (balance, line) =>
          line.side === "DEBIT" ? balance.plus(line.amount) : balance.minus(line.amount),
        new Decimal(0),
      )
      .toFixed(4);
  },
};
