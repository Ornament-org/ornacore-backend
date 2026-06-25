import { AppError } from "../shared/errors/AppError.js";

export const requireActorType =
  (...allowedActorTypes) =>
  (request, _response, next) => {
    if (!allowedActorTypes.includes(request.auth?.actorType)) {
      return next(
        new AppError("This account type cannot access the requested resource", {
          statusCode: 403,
          code: "ACTOR_TYPE_FORBIDDEN",
        }),
      );
    }

    return next();
  };
