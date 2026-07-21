import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { storeSettingsController } from "./store-settings.controller.js";
import { updateStoreSettingsSchema } from "./store-settings.validation.js";

export const storeSettingsAdminRouter = createModuleRouter();
export const storeSettingsPublicRouter = createModuleRouter();

// No permission gate beyond authAdmin: every authenticated staff member needs this for
// masthead branding (sidebar name, browser tab, favicon), regardless of settings.view.
storeSettingsAdminRouter.get("/branding", ...protectAdmin(), asyncHandler(storeSettingsController.branding));

// Fully unauthenticated — the storefront (ornacore-web) needs this before any shopkeeper
// login exists, to render its own header/logo/tab title. Same three fields as the admin
// branding route; no sensitive settings fields are exposed here either.
storeSettingsPublicRouter.get("/branding", asyncHandler(storeSettingsController.branding));

storeSettingsAdminRouter.get("/", ...protectAdmin(PERMISSIONS.SETTINGS_VIEW), asyncHandler(storeSettingsController.get));
storeSettingsAdminRouter.put(
  "/",
  ...protectAdmin(PERMISSIONS.SETTINGS_MANAGE),
  validate(updateStoreSettingsSchema),
  asyncHandler(storeSettingsController.update),
);
