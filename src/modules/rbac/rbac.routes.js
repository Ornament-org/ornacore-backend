import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requirePasswordChangeComplete } from "../../middlewares/requirePasswordChangeComplete.js";
import { validate } from "../../middlewares/validate.js";
import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { AppError } from "../../shared/errors/AppError.js";
import { createModuleRouter } from "../module.router.js";
import { rbacController } from "./rbac.controller.js";

export const rbacAdminRouter = createModuleRouter();

const updateRolePermissionSchema = z.object({
  body: z.object({
    roleId: z.coerce.number().int().positive(),
    permissionId: z.coerce.number().int().positive(),
    allowed: z.boolean(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const requireSuperAdmin = (request, _response, next) => {
  if (request.auth?.roles?.includes("SUPER_ADMIN")) return next();
  return next(
    new AppError("Only Super Admin can manage roles and permissions", {
      statusCode: 403,
      code: "SUPER_ADMIN_REQUIRED",
    }),
  );
};

rbacAdminRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.ADMIN, ACTOR_TYPES.STAFF),
  requirePasswordChangeComplete,
);

rbacAdminRouter.get("/roles", asyncHandler(rbacController.roles));
rbacAdminRouter.get("/permissions-matrix", asyncHandler(rbacController.permissionsMatrix));
rbacAdminRouter.put(
  "/role-permissions",
  requireSuperAdmin,
  validate(updateRolePermissionSchema),
  asyncHandler(rbacController.updateRolePermission),
);
