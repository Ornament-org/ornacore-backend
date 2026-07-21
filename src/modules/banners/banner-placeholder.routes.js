import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { bannerPlaceholderController } from "./banner-placeholder.controller.js";
import {
  createPlaceholderSchema,
  placeholderIdSchema,
  placeholderListSchema,
  updatePlaceholderSchema,
} from "./banner-placeholder.validation.js";

export const bannerPlaceholderAdminRouter = createModuleRouter();

bannerPlaceholderAdminRouter.use(...protectAdmin(PERMISSIONS.CONTENT_MANAGE));

bannerPlaceholderAdminRouter.get(
  "/",
  validate(placeholderListSchema),
  asyncHandler(bannerPlaceholderController.list),
);
bannerPlaceholderAdminRouter.post(
  "/",
  validate(createPlaceholderSchema),
  asyncHandler(bannerPlaceholderController.create),
);
bannerPlaceholderAdminRouter.get(
  "/:id",
  validate(placeholderIdSchema),
  asyncHandler(bannerPlaceholderController.getById),
);
bannerPlaceholderAdminRouter.patch(
  "/:id",
  validate(updatePlaceholderSchema),
  asyncHandler(bannerPlaceholderController.update),
);
bannerPlaceholderAdminRouter.delete(
  "/:id",
  validate(placeholderIdSchema),
  asyncHandler(bannerPlaceholderController.remove),
);
