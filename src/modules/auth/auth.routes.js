import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { authController } from "./auth.controller.js";
import {
  adminLoginSchema,
  changePasswordSchema,
  emptyBodySchema,
  refreshTokenSchema,
  shopkeeperLoginSchema,
  shopkeeperRegistrationSchema,
} from "./auth.validation.js";

export const adminAuthRouter = createModuleRouter();
export const shopkeeperAuthRouter = createModuleRouter();

adminAuthRouter.post(
  "/login",
  validate(adminLoginSchema),
  asyncHandler(authController.adminLogin),
);
adminAuthRouter.post(
  "/refresh",
  validate(refreshTokenSchema),
  asyncHandler(authController.refreshAdminSession),
);
adminAuthRouter.post("/logout", validate(refreshTokenSchema), asyncHandler(authController.logout));
adminAuthRouter.post(
  "/logout-all",
  authenticate,
  requireActorType(ACTOR_TYPES.ADMIN, ACTOR_TYPES.STAFF),
  validate(emptyBodySchema),
  asyncHandler(authController.logoutAll),
);
adminAuthRouter.get(
  "/me",
  authenticate,
  requireActorType(ACTOR_TYPES.ADMIN, ACTOR_TYPES.STAFF),
  asyncHandler(authController.me),
);
adminAuthRouter.post(
  "/change-password",
  authenticate,
  requireActorType(ACTOR_TYPES.ADMIN, ACTOR_TYPES.STAFF),
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

shopkeeperAuthRouter.post(
  "/register",
  validate(shopkeeperRegistrationSchema),
  asyncHandler(authController.registerShopkeeper),
);
shopkeeperAuthRouter.post(
  "/login",
  validate(shopkeeperLoginSchema),
  asyncHandler(authController.shopkeeperLogin),
);
shopkeeperAuthRouter.post(
  "/refresh",
  validate(refreshTokenSchema),
  asyncHandler(authController.refreshShopkeeperSession),
);
shopkeeperAuthRouter.post(
  "/logout",
  validate(refreshTokenSchema),
  asyncHandler(authController.logout),
);
shopkeeperAuthRouter.post(
  "/logout-all",
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  validate(emptyBodySchema),
  asyncHandler(authController.logoutAll),
);
shopkeeperAuthRouter.get(
  "/me",
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  asyncHandler(authController.me),
);
