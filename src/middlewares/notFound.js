import { AppError } from "../shared/errors/AppError.js";

export const notFound = (request, _response, next) => {
  next(
    new AppError(`Route not found: ${request.method} ${request.originalUrl}`, {
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
    }),
  );
};
