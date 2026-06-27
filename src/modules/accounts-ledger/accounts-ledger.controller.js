import db from "../../database/models/InitializeModels.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";

const listAccounts = async (_request, response) => {
  try {
    const accounts = await db.LedgerAccount.findAll({
      include: [{ model: db.ShopkeeperProfile, as: "shopkeeper", required: false }],
      order: [
        ["ownerType", "ASC"],
        ["name", "ASC"],
      ],
    });
    response.json(ApiResponse.success({ data: accounts }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const listJournals = async (request, response) => {
  try {
    const { page, pageSize } = request.validated.query;
    const { rows, count } = await db.JournalEntry.findAndCountAll({
      include: [
        {
          model: db.JournalLine,
          as: "lines",
          include: [{ model: db.LedgerAccount, as: "ledgerAccount" }],
        },
      ],
      order: [["entryDate", "DESC"]],
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

const getShopkeeperAccount = async (request, response) => {
  try {
    const account = await db.LedgerAccount.findOne({
      where: { shopkeeperId: request.validated.params.shopkeeperId },
      include: [
        {
          model: db.JournalLine,
          as: "journalLines",
          include: [{ model: db.JournalEntry, as: "journalEntry" }],
        },
      ],
    });
    response.json(ApiResponse.success({ data: account }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const shopkeeperGetMyAccount = async (request, response) => {
  try {
    const account = await db.LedgerAccount.findOne({
      where: { shopkeeperId: request.shopkeeper.id },
      include: [
        {
          model: db.JournalLine,
          as: "journalLines",
          include: [
            {
              model: db.JournalEntry,
              as: "journalEntry",
              where: { status: "POSTED" },
              required: true,
            },
          ],
        },
      ],
    });
    const balance = (account?.journalLines ?? []).reduce(
      (total, line) => total + (line.side === "DEBIT" ? Number(line.amount) : -Number(line.amount)),
      0,
    );
    response.json(
      ApiResponse.success({
        data: account ? { ...account.toJSON(), balance: balance.toFixed(2) } : null,
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

export const accountsLedgerController = {
  listAccounts,
  listJournals,
  getShopkeeperAccount,
  shopkeeperGetMyAccount,
};
