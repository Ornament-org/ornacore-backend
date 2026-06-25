import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { openApiDocument } from "./config/openapi.js";
import { apiRateLimiter } from "./middlewares/rateLimiters.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { requestContext } from "./middlewares/requestContext.js";
import { apiRouter } from "./routes/index.js";
import { AppError } from "./shared/errors/AppError.js";

export const createApp = () => {
  const app = express();

  if (env.TRUST_PROXY) app.set("trust proxy", 1);

  app.disable("x-powered-by");
  app.use(requestContext);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
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

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get("/openapi.json", (_request, response) => response.json(openApiDocument));
  app.use(env.API_PREFIX, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
