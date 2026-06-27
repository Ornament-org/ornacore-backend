import { z } from "zod";
import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { accountsLedgerController } from "./accounts-ledger.controller.js";

export const accountsLedgerAdminRouter = createModuleRouter();
export const accountsLedgerShopkeeperRouter = createModuleRouter();

accountsLedgerAdminRouter.use(...protectAdmin(PERMISSIONS.LEDGER_VIEW));

accountsLedgerAdminRouter.get(
  "/",
  asyncHandler(accountsLedgerController.listAccounts),
);

accountsLedgerAdminRouter.get(
  "/journals",
  validate(listQuerySchema),
  asyncHandler(accountsLedgerController.listJournals),
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
  asyncHandler(accountsLedgerController.getShopkeeperAccount),
);

accountsLedgerShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);

accountsLedgerShopkeeperRouter.get(
  "/",
  asyncHandler(accountsLedgerController.shopkeeperGetMyAccount),
);
