import { PERMISSIONS } from "../../constants/permissions.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { mediaController } from "./media.controller.js";
import { mediaUpload } from "./media.upload.middleware.js";

export const mediaAdminRouter = createModuleRouter();

mediaAdminRouter.use(...protectAdmin(PERMISSIONS.MEDIA_MANAGE));

mediaAdminRouter.get(
  "/",
  asyncHandler(mediaController.list),
);

mediaAdminRouter.post(
  "/",
  mediaUpload.array("files", 10),
  asyncHandler(mediaController.upload),
);
