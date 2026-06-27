import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { shopkeeperController, shopkeeperDetailsController } from "./shopkeeper.controller.js";
import {
  approvalSchema,
  reasonSchema,
  updateSchema,
  updateMyProfileSchema,
  upsertAddressSchema,
  submitForApprovalSchema,
} from "./shopkeeper.validation.js";

export const shopkeeperAdminRouter = createModuleRouter();
export const shopkeeperProfileRouter = createModuleRouter();

shopkeeperAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(listQuerySchema),
  asyncHandler(shopkeeperController.list),
);

shopkeeperAdminRouter.get(
  "/:id/details",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperDetailsController.details),
);

shopkeeperAdminRouter.get(
  "/:id/analytics",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperDetailsController.analytics),
);

shopkeeperAdminRouter.get(
  "/:id/orders-summary",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperDetailsController.ordersSummary),
);

shopkeeperAdminRouter.get(
  "/:id/ledger-summary",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperDetailsController.ledgerSummary),
);

shopkeeperAdminRouter.get(
  "/:id/recent-activity",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperDetailsController.recentActivity),
);

shopkeeperAdminRouter.get(
  "/:id",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperController.getById),
);

shopkeeperAdminRouter.patch(
  "/:id",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_UPDATE),
  validate(updateSchema),
  asyncHandler(shopkeeperController.update),
);

shopkeeperAdminRouter.post(
  "/:id/approve",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_APPROVE),
  validate(approvalSchema),
  asyncHandler(shopkeeperController.approve),
);

shopkeeperAdminRouter.post(
  "/:id/reject",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_REJECT),
  validate(reasonSchema),
  asyncHandler(shopkeeperController.reject),
);

shopkeeperAdminRouter.post(
  "/:id/suspend",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_SUSPEND),
  validate(reasonSchema),
  asyncHandler(shopkeeperController.suspend),
);

shopkeeperAdminRouter.post(
  "/:id/block",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_BLOCK),
  validate(reasonSchema),
  asyncHandler(shopkeeperController.block),
);

shopkeeperAdminRouter.post(
  "/:id/request-more-info",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_UPDATE),
  validate(reasonSchema),
  asyncHandler(shopkeeperController.requestMoreInfo),
);

shopkeeperProfileRouter.use(authenticate, requireActorType(ACTOR_TYPES.SHOPKEEPER));

shopkeeperProfileRouter.get(
  "/",
  asyncHandler(shopkeeperController.getMyProfile),
);

shopkeeperProfileRouter.patch(
  "/",
  validate(updateMyProfileSchema),
  asyncHandler(shopkeeperController.updateMyProfile),
);

shopkeeperProfileRouter.put(
  "/address",
  validate(upsertAddressSchema),
  asyncHandler(shopkeeperController.upsertMyAddress),
);

shopkeeperProfileRouter.post(
  "/submit-for-approval",
  validate(submitForApprovalSchema),
  asyncHandler(shopkeeperController.submitForApproval),
);
