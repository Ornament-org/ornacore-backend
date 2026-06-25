import { AppError } from "../shared/errors/AppError.js";
import { validationDetails, validationMessage } from "../shared/errors/validationFormatter.js";

export const validate = (schema) => async (request, _response, next) => {
  const parsed = await schema.safeParseAsync({
    body: request.body,
    params: request.params,
    query: request.query,
  });

  if (!parsed.success) {
    return next(
      new AppError(validationMessage(parsed.error), {
        statusCode: 422,
        code: "VALIDATION_ERROR",
        details: validationDetails(parsed.error),
      }),
    );
  }

  request.validated = parsed.data;
  return next();
};
