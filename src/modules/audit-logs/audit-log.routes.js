import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { auditLogController } from "./audit-log.controller.js";

export const auditLogAdminRouter = createModuleRouter();

auditLogAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.AUDIT_VIEW),
  validate(listQuerySchema),
  asyncHandler(auditLogController.list),
);
