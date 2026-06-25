import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { staffController } from "./staff.controller.js";
import {
  createStaffSchema,
  resetStaffPasswordSchema,
  updateStaffSchema,
} from "./staff.validation.js";

export const staffAdminRouter = createModuleRouter();

staffAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.STAFF_VIEW),
  validate(listQuerySchema),
  asyncHandler(staffController.list),
);

staffAdminRouter.post(
  "/",
  ...protectAdmin(PERMISSIONS.STAFF_CREATE),
  validate(createStaffSchema),
  asyncHandler(staffController.create),
);

staffAdminRouter.patch(
  "/:id",
  ...protectAdmin(PERMISSIONS.STAFF_UPDATE),
  validate(updateStaffSchema),
  asyncHandler(staffController.update),
);

staffAdminRouter.post(
  "/:id/reset-password",
  ...protectAdmin(PERMISSIONS.STAFF_UPDATE),
  validate(resetStaffPasswordSchema),
  asyncHandler(staffController.resetPassword),
);

staffAdminRouter.delete(
  "/:id",
  ...protectAdmin(PERMISSIONS.STAFF_DELETE),
  validate(idParamSchema),
  asyncHandler(staffController.remove),
);

staffAdminRouter.post(
  "/:id/restore",
  ...protectAdmin(PERMISSIONS.STAFF_CREATE),
  validate(idParamSchema),
  asyncHandler(staffController.restore),
);
