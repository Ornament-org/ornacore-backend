import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { inventoryController } from "./inventory.controller.js";
import { adjustmentSchema } from "./inventory.validation.js";

export const inventoryAdminRouter = createModuleRouter();

inventoryAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.INVENTORY_VIEW),
  validate(listQuerySchema),
  asyncHandler(inventoryController.list),
);

inventoryAdminRouter.get(
  "/movements",
  ...protectAdmin(PERMISSIONS.INVENTORY_VIEW),
  validate(listQuerySchema),
  asyncHandler(inventoryController.listMovements),
);

inventoryAdminRouter.get(
  "/:id",
  ...protectAdmin(PERMISSIONS.INVENTORY_VIEW),
  validate(idParamSchema),
  asyncHandler(inventoryController.getById),
);

inventoryAdminRouter.post(
  "/:id/adjust",
  ...protectAdmin(PERMISSIONS.INVENTORY_UPDATE),
  validate(adjustmentSchema),
  asyncHandler(inventoryController.adjust),
);
