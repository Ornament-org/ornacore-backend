import { setInterval } from "node:timers";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { databaseBackupService } from "./database-backup.service.js";

let timer = null;
let running = false;

const runScheduledBackup = async () => {
  if (running) {
    logger.warn("Database backup skipped because a previous run is still active");
    return;
  }

  running = true;
  try {
    await databaseBackupService.createBackup({ email: true });
  } catch (error) {
    logger.error("Database backup failed", { error });
  } finally {
    running = false;
  }
};

export const startDatabaseBackupScheduler = () => {
  if (env.NODE_ENV === "test" || !env.DB_BACKUP_ENABLED || timer) return;

  timer = setInterval(runScheduledBackup, env.DB_BACKUP_INTERVAL_MS);
  timer.unref?.();

  logger.info("Database backup scheduler started", {
    intervalMs: env.DB_BACKUP_INTERVAL_MS,
    retentionCount: env.DB_BACKUP_RETENTION_COUNT,
    backupDir: env.DB_BACKUP_DIR,
    emailTo: env.SUPER_ADMIN_EMAIL,
  });
};
