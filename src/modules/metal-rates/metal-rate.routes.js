import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { metalRateController } from "./metal-rate.controller.js";
import { emptyMetalRateQuerySchema, upsertMetalRateSchema } from "./metal-rate.validation.js";

export const metalRateAdminRouter = createModuleRouter();
export const metalRateShopkeeperRouter = createModuleRouter();

metalRateAdminRouter.use(...protectAdmin(PERMISSIONS.CATALOG_MANAGE));
metalRateAdminRouter.get("/", validate(emptyMetalRateQuerySchema), asyncHandler(metalRateController.list));
metalRateAdminRouter.post(
  "/sync/bullions",
  validate(emptyMetalRateQuerySchema),
  asyncHandler(metalRateController.syncBullions),
);
metalRateAdminRouter.put(
  "/:metalId",
  validate(upsertMetalRateSchema),
  asyncHandler(metalRateController.upsert),
);

metalRateShopkeeperRouter.get(
  "/",
  validate(emptyMetalRateQuerySchema),
  asyncHandler(metalRateController.list),
);
