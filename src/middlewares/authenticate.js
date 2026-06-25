import { verifyAccessToken } from "../modules/auth/auth.token.service.js";
import { AppError } from "../shared/errors/AppError.js";

export const authenticate = (request, _response, next) => {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next(
      new AppError("Authentication is required", {
        statusCode: 401,
        code: "AUTHENTICATION_REQUIRED",
      }),
    );
  }

  try {
    request.auth = verifyAccessToken(authorization.slice(7));
    if (request.auth.type !== "access" || !request.auth.sub) {
      throw new Error("Token is not an access token");
    }
    return next();
  } catch (error) {
    return next(
      new AppError("Access token is invalid or expired", {
        statusCode: 401,
        code: "INVALID_ACCESS_TOKEN",
        cause: error,
      }),
    );
  }
};
