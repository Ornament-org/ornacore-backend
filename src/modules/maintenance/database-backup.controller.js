import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { databaseBackupJobService } from "./database-backup-job.service.js";

const getBackupSettings = async (_request, response) =>
  response.json(
    ApiResponse.success({
      data: {
        backup: {
          recipientEmail: env.SUPER_ADMIN_EMAIL ?? null,
        },
      },
    }),
  );

const requestEmailBackup = async (request, response) => {
  const recipientEmail = request.validated.body.email || env.SUPER_ADMIN_EMAIL;

  if (!recipientEmail) {
    throw new AppError("Enter a backup email address before requesting a backup", {
      statusCode: 422,
      code: "DATABASE_BACKUP_RECIPIENT_REQUIRED",
    });
  }

  const job = databaseBackupJobService.start({ recipientEmail });

  return response.status(202).json(
    ApiResponse.success({
      message: `Database backup started. It will be emailed to ${recipientEmail}`,
      data: { job },
    }),
  );
};

const getBackupJob = async (request, response) => {
  const job = databaseBackupJobService.get(request.validated.params.jobId);

  if (!job) {
    throw new AppError("Backup job was not found. It may have expired or the server was restarted.", {
      statusCode: 404,
      code: "DATABASE_BACKUP_JOB_NOT_FOUND",
    });
  }

  return response.json(ApiResponse.success({ data: { job } }));
};

const cancelBackupJob = async (request, response) => {
  const job = databaseBackupJobService.cancel(request.validated.params.jobId);

  if (!job) {
    throw new AppError("Backup job was not found. It may have expired or the server was restarted.", {
      statusCode: 404,
      code: "DATABASE_BACKUP_JOB_NOT_FOUND",
    });
  }

  return response.json(
    ApiResponse.success({
      message: "Backup job cancelled.",
      data: { job },
    }),
  );
};

const cancelActiveBackupJobs = async (_request, response) => {
  const jobs = databaseBackupJobService.cancelActive();

  return response.json(
    ApiResponse.success({
      message: jobs.length ? "Running backup jobs cancelled." : "No running backup jobs found.",
      data: { jobs },
    }),
  );
};

export const databaseBackupController = {
  cancelActiveBackupJobs,
  cancelBackupJob,
  getBackupSettings,
  getBackupJob,
  requestEmailBackup,
};
