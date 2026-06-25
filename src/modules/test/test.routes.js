import { env } from "../../config/env.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { testController } from "./test.controller.js";
import { createSuperAdminSchema } from "./test.validation.js";

export const testRouter = createModuleRouter();

const loopbackAddresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

const requireLocalDevelopment = (request, _response, next) => {
  if (env.NODE_ENV === "production") {
    return next(
      new AppError("Test setup routes are disabled in production", {
        statusCode: 404,
        code: "ROUTE_NOT_FOUND",
      }),
    );
  }

  if (!loopbackAddresses.has(request.ip)) {
    return next(
      new AppError("Test setup routes are available only from localhost", {
        statusCode: 403,
        code: "LOCALHOST_ONLY",
      }),
    );
  }

  return next();
};

testRouter.post(
  "/create-super-admin",
  requireLocalDevelopment,
  validate(createSuperAdminSchema),
  asyncHandler(testController.createSuperAdmin),
);
