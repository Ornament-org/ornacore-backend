import { getRedisClient } from "../../config/redis.js";

export const cacheService = {
  async get(key) {
    const client = getRedisClient();
    if (!client?.isOpen) return null;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key, value, ttlSeconds) {
    const client = getRedisClient();
    if (!client?.isOpen) return false;
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  },

  async delete(key) {
    const client = getRedisClient();
    if (!client?.isOpen) return false;
    await client.del(key);
    return true;
  },
};
