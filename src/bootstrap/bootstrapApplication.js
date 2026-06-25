import db from "../database/models/InitializeModels.js";
import { connectRedis } from "../config/redis.js";
import { logger } from "../config/logger.js";

export const bootstrapApplication = async () => {
  await db.sequelize.authenticate();
  logger.info("MySQL connection established");

  const redis = await connectRedis();
  if (redis) logger.info("Redis connection established");

  return db;
};
