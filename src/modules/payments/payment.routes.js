import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { paymentController } from "./payment.controller.js";
import { paymentSchema, statusSchema } from "./payment.validation.js";

export const paymentAdminRouter = createModuleRouter();
export const paymentShopkeeperRouter = createModuleRouter();

paymentAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.PAYMENT_VIEW),
  validate(listQuerySchema),
  asyncHandler(paymentController.list),
);

paymentAdminRouter.get(
  "/due",
  ...protectAdmin(PERMISSIONS.PAYMENT_VIEW),
  asyncHandler(paymentController.getDue),
);

paymentAdminRouter.get(
  "/:id",
  ...protectAdmin(PERMISSIONS.PAYMENT_VIEW),
  validate(idParamSchema),
  asyncHandler(paymentController.getById),
);

paymentAdminRouter.post(
  "/",
  ...protectAdmin(PERMISSIONS.PAYMENT_UPDATE_STATUS),
  validate(paymentSchema),
  asyncHandler(paymentController.create),
);

paymentAdminRouter.patch(
  "/:id/status",
  ...protectAdmin(PERMISSIONS.PAYMENT_UPDATE_STATUS),
  validate(statusSchema),
  asyncHandler(paymentController.updateStatus),
);

paymentShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);

paymentShopkeeperRouter.get(
  "/",
  asyncHandler(paymentController.shopkeeperList),
);
