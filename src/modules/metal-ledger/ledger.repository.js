import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { LEDGER_TRANSACTION_STATUSES } from "./ledger.constants.js";

const includeEntries = [
  {
    model: db.LedgerEntry,
    as: "entries",
    include: [{ model: db.Metal, as: "metal" }],
  },
];

export const ledgerRepository = {
  findShopkeeper(shopkeeperId, options = {}) {
    return db.ShopkeeperProfile.findByPk(shopkeeperId, options);
  },

  findTransactionById(id, options = {}) {
    return db.LedgerTransaction.findByPk(id, {
      include: includeEntries,
      ...options,
    });
  },

  findTransactions({ shopkeeperId, metalId, from, to, limit, offset }) {
    const where = {
      shopkeeperId,
      status: LEDGER_TRANSACTION_STATUSES.POSTED,
    };
    if (from || to) {
      where.transactionDate = {
        ...(from ? { [Op.gte]: from } : {}),
        ...(to ? { [Op.lte]: to } : {}),
      };
    }

    return db.LedgerTransaction.findAndCountAll({
      where,
      include: [
        {
          ...includeEntries[0],
          ...(metalId ? { where: { metalId } } : {}),
        },
      ],
      distinct: true,
      limit,
      offset,
      order: [
        ["transactionDate", "DESC"],
        ["id", "DESC"],
      ],
    });
  },

  findPostedEntries({ shopkeeperId, metalId, to } = {}) {
    const transactionWhere = {
      status: LEDGER_TRANSACTION_STATUSES.POSTED,
      ...(shopkeeperId ? { shopkeeperId } : {}),
      ...(to ? { transactionDate: { [Op.lte]: to } } : {}),
    };
    return db.LedgerEntry.findAll({
      where: {
        ...(metalId ? { metalId } : {}),
      },
      include: [
        {
          model: db.LedgerTransaction,
          as: "transaction",
          where: transactionWhere,
          required: true,
        },
        { model: db.Metal, as: "metal" },
      ],
    });
  },
};
