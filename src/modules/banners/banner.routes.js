import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { bannerController } from "./banner.controller.js";
import {
  bannerIdSchema,
  bannerListSchema,
  createBannerSchema,
  publicBannerListSchema,
  reorderBannersSchema,
  updateBannerSchema,
} from "./banner.validation.js";

export const bannerAdminRouter = createModuleRouter();
export const bannerPublicRouter = createModuleRouter();

bannerAdminRouter.use(...protectAdmin(PERMISSIONS.CONTENT_MANAGE));

bannerAdminRouter.get("/", validate(bannerListSchema), asyncHandler(bannerController.list));
bannerAdminRouter.post("/", validate(createBannerSchema), asyncHandler(bannerController.create));
bannerAdminRouter.put(
  "/reorder",
  validate(reorderBannersSchema),
  asyncHandler(bannerController.reorder),
);
bannerAdminRouter.get("/:id", validate(bannerIdSchema), asyncHandler(bannerController.getById));
bannerAdminRouter.patch("/:id", validate(updateBannerSchema), asyncHandler(bannerController.update));
bannerAdminRouter.delete("/:id", validate(bannerIdSchema), asyncHandler(bannerController.remove));

// Fully unauthenticated — storefront reads banners for a named placement.
bannerPublicRouter.get(
  "/",
  validate(publicBannerListSchema),
  asyncHandler(bannerController.publicListByPlacement),
);
