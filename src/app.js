import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { URL } from "node:url";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { apiRateLimiter } from "./middlewares/rateLimiters.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { requestContext } from "./middlewares/requestContext.js";
import { AppError } from "./shared/errors/AppError.js";
import adminRoutes from "./routes/admin.routes.js";
import shopkeeperRoutes from "./routes/shopkeeper.routes.js";
import { featureFlagPublicRouter } from "./modules/feature-flags/feature-flag.routes.js";
import { homepagePublicRouter } from "./modules/homepage/homepage.routes.js";
import { storeSettingsPublicRouter } from "./modules/settings/store-settings.routes.js";
import { categoryPublicRouter } from "./modules/categories/category.routes.js";
import { productPublicRouter } from "./modules/products/product.routes.js";
import { collectionPublicRouter } from "./modules/collections/collection.routes.js";
import { metalPublicRouter } from "./modules/metals/metal.routes.js";
import { bannerPublicRouter } from "./modules/banners/banner.routes.js";

const defaultCorsOrigins = [
  "https://orna.vedantaa.in",
  "https://tool.orna.vedantaa.in",
];

const normalizeOrigin = (origin) => {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, "");
  }
};

const corsOrigins = new Set(
  [...env.CORS_ORIGINS, env.ADMIN_APP_URL, ...defaultCorsOrigins]
    .filter(Boolean)
    .map(normalizeOrigin),
);

export const createApp = () => {
  const app = express();

  if (env.TRUST_PROXY) app.set("trust proxy", 1);

  app.disable("x-powered-by");
  app.use(requestContext);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.has(normalizeOrigin(origin))) return callback(null, true);
        return callback(
          new AppError("Origin is not allowed by CORS", {
            statusCode: 403,
            code: "CORS_ORIGIN_FORBIDDEN",
          }),
        );
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(
    "/uploads",
    express.static(path.resolve(env.LOCAL_UPLOAD_DIR), {
      setHeaders(response) {
        response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(apiRateLimiter);

  app.get("/", (req, res) => {
    try {
      res.json({
        message: `Welcome to the db ${env.DB_NAME} in ${env.NODE_ENV} backend of OrnaMent`
      });
    } catch (error) {
      logger.error("Error in home route", { error });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/shopkeeper", shopkeeperRoutes);
  app.use("/api/v1/config", featureFlagPublicRouter);
  app.use("/api/v1/homepage", homepagePublicRouter);
  app.use("/api/v1/store-settings", storeSettingsPublicRouter);
  app.use("/api/v1/categories", categoryPublicRouter);
  app.use("/api/v1/products", productPublicRouter);
  app.use("/api/v1/collections", collectionPublicRouter);
  app.use("/api/v1/metals", metalPublicRouter);
  app.use("/api/v1/banners", bannerPublicRouter);
  app.use("/admin", adminRoutes);
  app.use("/shopkeeper", shopkeeperRoutes);
  app.use("/config", featureFlagPublicRouter);
  app.use("/homepage", homepagePublicRouter);
  app.use("/store-settings", storeSettingsPublicRouter);
  app.use("/categories", categoryPublicRouter);
  app.use("/products", productPublicRouter);
  app.use("/collections", collectionPublicRouter);
  app.use("/metals", metalPublicRouter);
  app.use("/banners", bannerPublicRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
