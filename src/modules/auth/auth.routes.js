import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { authController } from "./auth.controller.js";
import {
  adminGoogleLoginSchema,
  adminLoginSchema,
  adminOtpLoginRequestSchema,
  adminOtpLoginVerifySchema,
  changePasswordSchema,
  emptyBodySchema,
  otpLoginRequestSchema,
  otpLoginVerifySchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  registrationEmailOtpRequestSchema,
  registrationEmailOtpVerifySchema,
  refreshTokenSchema,
  shopkeeperGoogleLoginSchema,
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
  "/google-login",
  validate(adminGoogleLoginSchema),
  asyncHandler(authController.adminGoogleLogin),
);
adminAuthRouter.post(
  "/otp-login/request",
  validate(adminOtpLoginRequestSchema),
  asyncHandler(authController.requestAdminLoginOtp),
);
adminAuthRouter.post(
  "/otp-login/verify",
  validate(adminOtpLoginVerifySchema),
  asyncHandler(authController.verifyAdminLoginOtp),
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
  "/registration-email-otp/request",
  validate(registrationEmailOtpRequestSchema),
  asyncHandler(authController.requestShopkeeperRegistrationEmailOtp),
);
shopkeeperAuthRouter.post(
  "/registration-email-otp/verify",
  validate(registrationEmailOtpVerifySchema),
  asyncHandler(authController.verifyShopkeeperRegistrationEmailOtp),
);
shopkeeperAuthRouter.post(
  "/login",
  validate(shopkeeperLoginSchema),
  asyncHandler(authController.shopkeeperLogin),
);
shopkeeperAuthRouter.post(
  "/google-login",
  validate(shopkeeperGoogleLoginSchema),
  asyncHandler(authController.shopkeeperGoogleLogin),
);
shopkeeperAuthRouter.post(
  "/otp-login/request",
  validate(otpLoginRequestSchema),
  asyncHandler(authController.requestShopkeeperLoginOtp),
);
shopkeeperAuthRouter.post(
  "/otp-login/verify",
  validate(otpLoginVerifySchema),
  asyncHandler(authController.verifyShopkeeperLoginOtp),
);
shopkeeperAuthRouter.post(
  "/password-reset/request",
  validate(passwordResetRequestSchema),
  asyncHandler(authController.requestShopkeeperPasswordReset),
);
shopkeeperAuthRouter.post(
  "/password-reset/verify",
  validate(passwordResetVerifySchema),
  asyncHandler(authController.verifyShopkeeperPasswordResetOtp),
);
shopkeeperAuthRouter.post(
  "/password-reset/confirm",
  validate(passwordResetConfirmSchema),
  asyncHandler(authController.confirmShopkeeperPasswordReset),
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
