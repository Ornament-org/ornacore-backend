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
import { deliveryController } from "./delivery.controller.js";
import { createDeliverySchema, updateDeliverySchema } from "./delivery.validation.js";

export const deliveryAdminRouter = createModuleRouter();

export const deliveryShopkeeperRouter = createModuleRouter();

deliveryAdminRouter.use(...protectAdmin(PERMISSIONS.DELIVERY_MANAGE));

deliveryAdminRouter.get("/", validate(listQuerySchema), asyncHandler(deliveryController.list));
deliveryAdminRouter.get("/:id", validate(idParamSchema), asyncHandler(deliveryController.getById));
deliveryAdminRouter.post(
  "/",
  validate(createDeliverySchema),
  asyncHandler(deliveryController.create),
);
deliveryAdminRouter.patch(
  "/:id",
  validate(updateDeliverySchema),
  asyncHandler(deliveryController.update),
);

deliveryShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);
deliveryShopkeeperRouter.get("/", asyncHandler(deliveryController.listForShopkeeper));
