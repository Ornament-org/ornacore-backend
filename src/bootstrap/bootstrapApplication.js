import db from "../database/models/InitializeModels.js";
import { connectRedis } from "../config/redis.js";
import { logger } from "../config/logger.js";

export const bootstrapApplication = async () => {
  try {
    await db.sequelize.authenticate();
    logger.info("MySQL connection established successfully");
  } catch (error) {
    logger.error("Failed to establish MySQL connection", error);
    throw error;
  }

  const redis = await connectRedis();
  if (redis) {
    logger.info("Redis connection established successfully");
  } else {
    logger.warn("Redis connection not established");
  }

  return db;
};
