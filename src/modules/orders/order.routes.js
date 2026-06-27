import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { orderController } from "./order.controller.js";
import {
  createOrderSchema,
  statusSchema,
  assignSchema,
  shopkeeperPlaceOrderSchema,
} from "./order.validation.js";

export const orderAdminRouter = createModuleRouter();
export const orderShopkeeperRouter = createModuleRouter();

orderAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.ORDER_VIEW),
  validate(listQuerySchema),
  asyncHandler(orderController.adminList),
);

orderAdminRouter.get(
  "/:id",
  ...protectAdmin(PERMISSIONS.ORDER_VIEW),
  validate(idParamSchema),
  asyncHandler(orderController.adminGetById),
);

orderAdminRouter.post(
  "/",
  ...protectAdmin(PERMISSIONS.ORDER_UPDATE_STATUS),
  validate(createOrderSchema),
  asyncHandler(orderController.adminCreate),
);

orderAdminRouter.post(
  "/:id/status",
  ...protectAdmin(PERMISSIONS.ORDER_UPDATE_STATUS),
  validate(statusSchema),
  asyncHandler(orderController.adminUpdateStatus),
);

orderAdminRouter.post(
  "/:id/assign",
  ...protectAdmin(PERMISSIONS.ORDER_UPDATE_STATUS),
  validate(assignSchema),
  asyncHandler(orderController.adminAssign),
);

orderShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);

orderShopkeeperRouter.get(
  "/",
  validate(listQuerySchema),
  asyncHandler(orderController.shopkeeperList),
);

orderShopkeeperRouter.get(
  "/:id",
  validate(idParamSchema),
  asyncHandler(orderController.shopkeeperGetById),
);

orderShopkeeperRouter.post(
  "/",
  validate(shopkeeperPlaceOrderSchema),
  asyncHandler(orderController.shopkeeperCreate),
);
