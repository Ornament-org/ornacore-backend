import { app } from "./app.js";
import { bootstrapApplication } from "./bootstrap/bootstrapApplication.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { disconnectRedis } from "./config/redis.js";
import { sequelize } from "./config/database.js";

let server;
let shuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Graceful shutdown started");

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await Promise.allSettled([disconnectRedis(), sequelize.close()]);
  logger.info("Graceful shutdown completed");
  process.exit(exitCode);
};

try {
  await bootstrapApplication();
  server = app.listen(env.APP_PORT, env.APP_HOST, () => {
    logger.info(
      { host: env.APP_HOST, port: env.APP_PORT, environment: env.NODE_ENV },
      "OrnaCore API started",
    );
  });
} catch (error) {
  logger.fatal({ error }, "Application failed to start");
  await shutdown("STARTUP_ERROR", 1);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (error) => {
  logger.fatal({ error }, "Unhandled promise rejection");
  shutdown("UNHANDLED_REJECTION", 1);
});
process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception");
  shutdown("UNCAUGHT_EXCEPTION", 1);
});
