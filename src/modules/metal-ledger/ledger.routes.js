import { z } from "zod";
import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { metalLedgerController } from "./ledger.controller.js";
import {
  createLedgerTransactionSchema,
  idParamSchema,
  shopLedgerQuerySchema,
  updateLedgerTransactionSchema,
  voidLedgerTransactionSchema,
} from "./ledger.validator.js";

export const metalLedgerShopAdminRouter = createModuleRouter();
export const metalLedgerTransactionAdminRouter = createModuleRouter();
export const metalLedgerShopkeeperRouter = createModuleRouter();

const currentShopLedgerQuerySchema = shopLedgerQuerySchema.extend({
  params: z.object({}).passthrough(),
});

metalLedgerShopAdminRouter.get(
  "/:shopId/ledger/summary",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(shopLedgerQuerySchema),
  asyncHandler(metalLedgerController.getLedgerSummary),
);

metalLedgerShopAdminRouter.get(
  "/:shopId/ledger/timeline",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(shopLedgerQuerySchema),
  asyncHandler(metalLedgerController.getLedgerTimeline),
);

metalLedgerTransactionAdminRouter.post(
  "/",
  ...protectAdmin(PERMISSIONS.LEDGER_POST),
  validate(createLedgerTransactionSchema),
  asyncHandler(metalLedgerController.createLedgerTransaction),
);

metalLedgerTransactionAdminRouter.get(
  "/:id",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(idParamSchema),
  asyncHandler(metalLedgerController.getLedgerTransactionById),
);

metalLedgerTransactionAdminRouter.patch(
  "/:id",
  ...protectAdmin(PERMISSIONS.LEDGER_POST),
  validate(updateLedgerTransactionSchema),
  asyncHandler(metalLedgerController.updateLedgerTransaction),
);

metalLedgerTransactionAdminRouter.post(
  "/:id/void",
  ...protectAdmin(PERMISSIONS.LEDGER_POST),
  validate(voidLedgerTransactionSchema),
  asyncHandler(metalLedgerController.voidLedgerTransaction),
);

metalLedgerShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);

metalLedgerShopkeeperRouter.get(
  "/summary",
  validate(currentShopLedgerQuerySchema),
  asyncHandler(metalLedgerController.getCurrentShopLedgerSummary),
);

metalLedgerShopkeeperRouter.get(
  "/timeline",
  validate(currentShopLedgerQuerySchema),
  asyncHandler(metalLedgerController.getCurrentShopLedgerTimeline),
);
