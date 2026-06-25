import { AppError } from "../shared/errors/AppError.js";

export const authorize =
  (...requiredPermissions) =>
  (request, _response, next) => {
    if (request.auth?.roles?.includes("SUPER_ADMIN")) return next();

    const granted = new Set(request.auth?.permissions ?? []);
    const isAllowed = requiredPermissions.every((permission) => granted.has(permission));

    if (!isAllowed) {
      return next(
        new AppError("You do not have permission to perform this action", {
          statusCode: 403,
          code: "INSUFFICIENT_PERMISSION",
          details: { requiredPermissions },
        }),
      );
    }

    return next();
  };
