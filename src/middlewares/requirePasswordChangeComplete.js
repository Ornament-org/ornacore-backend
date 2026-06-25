import { AppError } from "../shared/errors/AppError.js";

export const requirePasswordChangeComplete = (request, _response, next) => {
  if (request.auth?.mustChangePassword) {
    return next(
      new AppError("You must change your temporary password before continuing", {
        statusCode: 403,
        code: "PASSWORD_CHANGE_REQUIRED",
      }),
    );
  }

  return next();
};
