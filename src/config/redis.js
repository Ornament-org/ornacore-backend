import { createClient } from "redis";
import { env } from "./env.js";
import { logger } from "./logger.js";

let redisClient;

export const getRedisClient = () => {
  if (!env.REDIS_ENABLED) return null;

  if (!redisClient) {
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on("error", (error) => logger.error("Redis client error:", error));
    redisClient.on("reconnecting", () => logger.warn("Redis client reconnecting"));
  }

  return redisClient;
};

export const connectRedis = async () => {
  const client = getRedisClient();
  if (client && !client.isOpen) await client.connect();
  return client;
};

export const disconnectRedis = async () => {
  if (redisClient?.isOpen) await redisClient.quit();
};
