import db from "../database/models/InitializeModels.js";
import { connectRedis } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { featureFlagService } from "../modules/feature-flags/feature-flag.service.js";
import { startDatabaseBackupScheduler } from "../modules/maintenance/database-backup.scheduler.js";
import { startMetalRateSyncScheduler } from "../modules/metal-rates/metal-rate-sync.scheduler.js";
import { repairProductImageMediaIndexes } from "../modules/products/product-image-index.repair.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectMysql = async () => {
  const maxAttempts = env.DB_CONNECT_RETRIES + 1;
  const connection = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      logger.info("Connecting to MySQL", { ...connection, attempt, maxAttempts });
      await db.sequelize.authenticate();
      logger.info("MySQL connection established successfully", connection);
      return;
    } catch (error) {
      const canRetry = attempt < maxAttempts;
      const logPayload = {
        ...connection,
        attempt,
        maxAttempts,
        code: error?.parent?.code ?? error?.original?.code ?? error?.code,
        message: error?.message,
      };

      if (!canRetry) {
        logger.error("Failed to establish MySQL connection", logPayload);
        throw error;
      }

      logger.warn("MySQL connection failed, retrying", {
        ...logPayload,
        retryInMs: env.DB_CONNECT_RETRY_DELAY_MS,
      });
      await sleep(env.DB_CONNECT_RETRY_DELAY_MS);
    }
  }
};

export const bootstrapApplication = async () => {
  await connectMysql();
  try {
    await repairProductImageMediaIndexes(db, logger);
  } catch (error) {
    logger.error("Failed to repair product image media indexes", {
      code: error?.parent?.code ?? error?.original?.code ?? error?.code,
      message: error?.message,
    });
  }

  const redis = await connectRedis();
  if (redis) {
    logger.info("Redis connection established successfully");
  } else {
    logger.warn("Redis connection not established");
  }

  // Seed default feature flags (idempotent — safe to run on every startup)
  await featureFlagService.seedDefaults(logger);
  startMetalRateSyncScheduler();
  startDatabaseBackupScheduler();

  return db;
};
