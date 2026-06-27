import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { featureFlagController } from "./feature-flag.controller.js";
import {
  createFlagSchema,
  listFlagQuerySchema,
  updateFlagSchema,
} from "./feature-flag.validation.js";

export const featureFlagAdminRouter = createModuleRouter();
export const featureFlagPublicRouter = createModuleRouter();

featureFlagAdminRouter.use(...protectAdmin(PERMISSIONS.FEATURE_FLAG_MANAGE));

// Named paths must be registered before /:id so Express matches them first
featureFlagAdminRouter.get("/stats", asyncHandler(featureFlagController.stats));
featureFlagAdminRouter.get("/modules", asyncHandler(featureFlagController.modules));
featureFlagAdminRouter.get("/", validate(listFlagQuerySchema), asyncHandler(featureFlagController.list));

featureFlagAdminRouter.get("/:id", validate(idParamSchema), asyncHandler(featureFlagController.getById));
featureFlagAdminRouter.get("/:id/audit", validate(idParamSchema), asyncHandler(featureFlagController.getAuditTrail));
featureFlagAdminRouter.post("/", validate(createFlagSchema), asyncHandler(featureFlagController.create));
featureFlagAdminRouter.patch("/:id", validate(updateFlagSchema), asyncHandler(featureFlagController.update));
featureFlagAdminRouter.post("/:id/toggle", validate(idParamSchema), asyncHandler(featureFlagController.toggle));
featureFlagAdminRouter.delete("/:id", validate(idParamSchema), asyncHandler(featureFlagController.remove));

// Public config endpoints — no auth, called by mobile/web apps
featureFlagPublicRouter.get("/:env", asyncHandler(featureFlagController.publicConfig));
