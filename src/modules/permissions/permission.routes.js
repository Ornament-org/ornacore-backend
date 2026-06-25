import { PERMISSIONS } from "../../constants/permissions.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { permissionController } from "./permission.controller.js";

export const permissionAdminRouter = createModuleRouter();

permissionAdminRouter.use(...protectAdmin(PERMISSIONS.PERMISSION_VIEW));

permissionAdminRouter.get("/", asyncHandler(permissionController.list));
