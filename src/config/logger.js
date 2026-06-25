import pino from "pino";
import { env } from "./env.js";

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = pino({
  name: env.APP_NAME,
  level: env.LOG_LEVEL,
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    environment: process.env.NODE_ENV,
    service: "ornacore-backend",
  },
});