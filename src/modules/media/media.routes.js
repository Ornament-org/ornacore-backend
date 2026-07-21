import { PERMISSIONS } from "../../constants/permissions.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { mediaController } from "./media.controller.js";
import { mediaUpload } from "./media.upload.middleware.js";

export const mediaAdminRouter = createModuleRouter();

mediaAdminRouter.use(...protectAdmin(PERMISSIONS.MEDIA_MANAGE));

// Named paths must be registered before /:id so Express matches them first
mediaAdminRouter.get("/folders", asyncHandler(mediaController.listFolders));
mediaAdminRouter.post("/folders", asyncHandler(mediaController.createFolder));
mediaAdminRouter.put("/folders/:id", asyncHandler(mediaController.updateFolder));
mediaAdminRouter.delete("/folders/:id", asyncHandler(mediaController.deleteFolder));

mediaAdminRouter.get("/", asyncHandler(mediaController.list));
mediaAdminRouter.post("/", mediaUpload.array("files", 10), asyncHandler(mediaController.upload));

mediaAdminRouter.get("/:id", asyncHandler(mediaController.get));
mediaAdminRouter.patch("/:id", asyncHandler(mediaController.update));
mediaAdminRouter.delete("/:id", asyncHandler(mediaController.trash));
mediaAdminRouter.post("/:id/restore", asyncHandler(mediaController.restore));
mediaAdminRouter.delete("/:id/purge", asyncHandler(mediaController.purge));
