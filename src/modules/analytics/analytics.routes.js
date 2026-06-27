import { z } from "zod";
import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { analyticsController } from "./analytics.controller.js";

const id = z.union([z.string(), z.number()]).pipe(z.coerce.number().int().positive());

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const shopkeeperOverviewSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ shopkeeperId: id }),
  query: z
    .object({
      startDate: dateString.optional(),
      endDate:   dateString.optional(),
    })
    .passthrough(),
});

export const analyticsAdminRouter = createModuleRouter();

analyticsAdminRouter.get(
  "/shopkeeper/:shopkeeperId/overview",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(shopkeeperOverviewSchema),
  asyncHandler(analyticsController.getShopkeeperOverview),
);
