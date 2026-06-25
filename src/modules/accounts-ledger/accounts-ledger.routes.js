import { z } from "zod";
import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import db from "../../database/models/InitializeModels.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { listQuerySchema } from "../../shared/http/crud.validation.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { createModuleRouter } from "../module.router.js";

export const accountsLedgerAdminRouter = createModuleRouter();
export const accountsLedgerShopkeeperRouter = createModuleRouter();

accountsLedgerAdminRouter.use(...protectAdmin(PERMISSIONS.LEDGER_VIEW));

accountsLedgerAdminRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const accounts = await db.LedgerAccount.findAll({
      include: [{ model: db.ShopkeeperProfile, as: "shopkeeper", required: false }],
      order: [
        ["ownerType", "ASC"],
        ["name", "ASC"],
      ],
    });
    response.json(ApiResponse.success({ data: accounts }));
  }),
);

accountsLedgerAdminRouter.get(
  "/journals",
  validate(listQuerySchema),
  asyncHandler(async (request, response) => {
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
  }),
);

accountsLedgerAdminRouter.get(
  "/shopkeepers/:shopkeeperId",
  validate(
    z.object({
      body: z.unknown().optional(),
      query: z.object({}).passthrough(),
      params: z.object({ shopkeeperId: z.coerce.number().int().positive() }),
    }),
  ),
  asyncHandler(async (request, response) => {
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
  }),
);

accountsLedgerShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);

accountsLedgerShopkeeperRouter.get(
  "/",
  asyncHandler(async (request, response) => {
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
  }),
);
