import { randomUUID } from "node:crypto";
import { setImmediate } from "node:timers";
import { logger } from "../../config/logger.js";
import { databaseBackupService } from "./database-backup.service.js";

const jobs = new Map();
const maxJobs = 25;
const terminalStatuses = new Set(["SENT", "FAILED", "CANCELLED"]);
const cancellableStatuses = new Set(["QUEUED", "BACKING_UP", "EMAILING"]);

const publicJob = (job) => ({
  id: job.id,
  status: job.status,
  recipientEmail: job.recipientEmail,
  fileName: job.fileName ?? null,
  sizeBytes: job.sizeBytes ?? null,
  messageId: job.messageId ?? null,
  accepted: job.accepted ?? [],
  rejected: job.rejected ?? [],
  error: job.error ?? null,
  cancelledAt: job.cancelledAt ?? null,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  completedAt: job.completedAt ?? null,
});

const trimJobs = () => {
  const extraCount = jobs.size - maxJobs;
  if (extraCount <= 0) return;
  [...jobs.keys()].slice(0, extraCount).forEach((jobId) => jobs.delete(jobId));
};

const updateJob = (job, patch) => {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  jobs.set(job.id, job);
  return job;
};

const serializeError = (error) => ({
  message: error?.message || "Backup email failed",
  code: error?.code || error?.responseCode || "BACKUP_EMAIL_FAILED",
  command: error?.command,
  response: error?.response,
});

const cancellationError = () => ({
  message: "Backup job was cancelled.",
  code: "DATABASE_BACKUP_JOB_CANCELLED",
});

const isCancelled = (job) => job.cancelRequested || job.status === "CANCELLED";

const assertNotCancelled = (job) => {
  if (!isCancelled(job)) return;
  const error = new Error("Backup job was cancelled.");
  error.code = "DATABASE_BACKUP_JOB_CANCELLED";
  throw error;
};

const markCancelled = (job) =>
  updateJob(job, {
    status: "CANCELLED",
    error: cancellationError(),
    cancelledAt: job.cancelledAt ?? new Date().toISOString(),
    completedAt: job.completedAt ?? new Date().toISOString(),
  });

const runJob = async (job) => {
  try {
    assertNotCancelled(job);
    updateJob(job, { status: "BACKING_UP" });
    const backup = await databaseBackupService.createBackup({
      email: false,
      signal: job.abortController.signal,
      onDumpProcess: (process) => {
        job.dumpProcess = process;
      },
    });
    job.dumpProcess = null;
    assertNotCancelled(job);
    updateJob(job, {
      status: "EMAILING",
      fileName: backup.fileName,
      sizeBytes: backup.sizeBytes,
    });
    assertNotCancelled(job);

    const emailResult = await databaseBackupService.sendBackupEmail({
      filePath: backup.filePath,
      fileName: backup.fileName,
      recipientEmail: job.recipientEmail,
    });

    if (isCancelled(job)) {
      markCancelled(job);
      return;
    }

    updateJob(job, {
      status: "SENT",
      messageId: emailResult?.messageId ?? null,
      accepted: emailResult?.accepted ?? [],
      rejected: emailResult?.rejected ?? [],
      completedAt: new Date().toISOString(),
    });

    logger.info("Manual database backup job sent", publicJob(job));
  } catch (error) {
    job.dumpProcess = null;
    if (isCancelled(job) || error.code === "DATABASE_BACKUP_CANCELLED" || error.code === "DATABASE_BACKUP_JOB_CANCELLED") {
      markCancelled(job);
      logger.info("Manual database backup job cancelled", publicJob(job));
      return;
    }

    updateJob(job, {
      status: "FAILED",
      error: serializeError(error),
      completedAt: new Date().toISOString(),
    });
    logger.error("Manual database backup job failed", publicJob(job));
  }
};

export const databaseBackupJobService = {
  start({ recipientEmail }) {
    const now = new Date().toISOString();
    const job = {
      id: randomUUID(),
      status: "QUEUED",
      recipientEmail,
      abortController: new globalThis.AbortController(),
      createdAt: now,
      updatedAt: now,
    };

    jobs.set(job.id, job);
    trimJobs();

    setImmediate(() => runJob(job));
    return publicJob(job);
  },

  get(jobId) {
    const job = jobs.get(jobId);
    return job ? publicJob(job) : null;
  },

  cancel(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    if (terminalStatuses.has(job.status)) return publicJob(job);

    job.cancelRequested = true;
    job.cancelledAt = new Date().toISOString();
    job.abortController?.abort();
    job.dumpProcess?.kill?.("SIGTERM");

    return publicJob(markCancelled(job));
  },

  cancelActive() {
    return [...jobs.values()]
      .filter((job) => cancellableStatuses.has(job.status))
      .map((job) => this.cancel(job.id))
      .filter(Boolean);
  },
};
