import { setInterval } from "node:timers";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { metalRateService } from "./metal-rate.service.js";

let timer = null;
let running = false;

const runSync = async () => {
  if (running) {
    logger.warn("Bullions metal-rate sync skipped because a previous run is still active");
    return;
  }

  running = true;
  try {
    const result = await metalRateService.syncFromBullionsBihar();
    logger.info("Bullions metal-rate sync completed", {
      synced: result.synced.map((item) => item.code),
      skipped: result.skipped,
      sourceRawUpdate: result.sourceRawUpdate,
    });
  } catch (error) {
    logger.error("Bullions metal-rate sync failed", { error });
  } finally {
    running = false;
  }
};

export const startMetalRateSyncScheduler = () => {
  if (env.NODE_ENV === "test" || !env.METAL_RATE_SYNC_ENABLED || timer) return;

  runSync();
  timer = setInterval(runSync, env.METAL_RATE_SYNC_INTERVAL_MS);
  timer.unref?.();

  logger.info("Bullions metal-rate sync scheduler started", {
    intervalMs: env.METAL_RATE_SYNC_INTERVAL_MS,
    sourceUrl: env.METAL_RATE_SYNC_URL,
  });
};
