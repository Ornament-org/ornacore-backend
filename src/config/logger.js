import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  name: env.APP_NAME,
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === "development" ? {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  } : undefined,
  base: {
    environment: env.NODE_ENV,
    service: "ornacore-backend",
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "token",
      "accessToken",
      "refreshToken",
      "otp",
      "*.password",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
});
