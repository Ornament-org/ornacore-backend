import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../shared/errors/AppError.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { databaseBackupController } from "./database-backup.controller.js";
import { emailDatabaseBackupSchema, getDatabaseBackupJobSchema } from "./database-backup.validation.js";

export const databaseBackupAdminRouter = createModuleRouter();

const requireSuperAdmin = (request, _response, next) => {
  if (request.auth?.roles?.includes("SUPER_ADMIN")) return next();

  return next(
    new AppError("Only super admins can request database backups", {
      statusCode: 403,
      code: "SUPER_ADMIN_REQUIRED",
    }),
  );
};

databaseBackupAdminRouter.get(
  "/database-backup",
  ...protectAdmin(),
  requireSuperAdmin,
  asyncHandler(databaseBackupController.getBackupSettings),
);

databaseBackupAdminRouter.get(
  "/database-backup/jobs/:jobId",
  ...protectAdmin(),
  requireSuperAdmin,
  validate(getDatabaseBackupJobSchema),
  asyncHandler(databaseBackupController.getBackupJob),
);

databaseBackupAdminRouter.post(
  "/database-backup/jobs/cancel",
  ...protectAdmin(),
  requireSuperAdmin,
  asyncHandler(databaseBackupController.cancelActiveBackupJobs),
);

databaseBackupAdminRouter.post(
  "/database-backup/jobs/:jobId/cancel",
  ...protectAdmin(),
  requireSuperAdmin,
  validate(getDatabaseBackupJobSchema),
  asyncHandler(databaseBackupController.cancelBackupJob),
);

databaseBackupAdminRouter.post(
  "/database-backup/email",
  ...protectAdmin(),
  requireSuperAdmin,
  validate(emailDatabaseBackupSchema),
  asyncHandler(databaseBackupController.requestEmailBackup),
);
