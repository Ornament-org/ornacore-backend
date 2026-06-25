import { Router } from "express";
import { ApiResponse } from "../shared/http/ApiResponse.js";
import { moduleRoutes } from "../modules/index.js";

export const apiRouter = Router();

apiRouter.get("/health", (_request, response) => {
  response.json(
    ApiResponse.success({
      message: "OrnaCore API is healthy",
      data: { status: "ok", timestamp: new Date().toISOString() },
    }),
  );
});

for (const { path, router } of moduleRoutes) {
  apiRouter.use(path, router);
}
