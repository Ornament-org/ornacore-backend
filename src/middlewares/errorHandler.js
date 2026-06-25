import {
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError as SequelizeValidationError,
} from "sequelize";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../shared/errors/AppError.js";
import { validationDetails, validationMessage } from "../shared/errors/validationFormatter.js";
import { ApiResponse } from "../shared/http/ApiResponse.js";

const normalizeError = (error) => {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError(validationMessage(error), {
      statusCode: 422,
      code: "VALIDATION_ERROR",
      details: validationDetails(error),
      cause: error,
    });
  }

  if (error instanceof multer.MulterError) {
    const errors = {
      LIMIT_FILE_SIZE: {
        message: `Each uploaded file must be ${env.UPLOAD_MAX_FILE_SIZE_MB} MB or smaller`,
        code: "MEDIA_FILE_TOO_LARGE",
        statusCode: 413,
      },
      LIMIT_FILE_COUNT: {
        message: "A maximum of 10 files can be uploaded at once",
        code: "MEDIA_FILE_LIMIT_EXCEEDED",
        statusCode: 422,
      },
      LIMIT_UNEXPECTED_FILE: {
        message: "The upload must use the multipart field named files",
        code: "INVALID_MEDIA_FIELD",
        statusCode: 422,
      },
    };
    const normalized = errors[error.code] ?? {
      message: error.message || "The uploaded files could not be processed",
      code: "MEDIA_UPLOAD_INVALID",
      statusCode: 422,
    };

    return new AppError(normalized.message, {
      statusCode: normalized.statusCode,
      code: normalized.code,
      details: { field: error.field ?? "files", uploadCode: error.code },
      cause: error,
    });
  }

  if (error instanceof UniqueConstraintError) {
    const field = error.errors?.[0]?.path;
    return new AppError(
      field
        ? `${String(field).replaceAll("_", " ")} already exists. Please use a different value.`
        : "A record with the same unique value already exists.",
      {
        statusCode: 409,
        code: "DUPLICATE_RESOURCE",
        details: error.errors.map(({ path, message }) => ({ path, message })),
        cause: error,
      },
    );
  }

  if (error instanceof ForeignKeyConstraintError) {
    return new AppError("A referenced record does not exist or cannot be used", {
      statusCode: 422,
      code: "INVALID_REFERENCE",
      details: {
        field: error.fields?.[0] ?? error.index ?? null,
      },
      cause: error,
    });
  }

  if (error instanceof SequelizeValidationError) {
    return new AppError("Database validation failed", {
      statusCode: 422,
      code: "DATABASE_VALIDATION_ERROR",
      details: error.errors.map(({ path, message }) => ({ path, message })),
      cause: error,
    });
  }

  return new AppError("An unexpected error occurred", {
    statusCode: 500,
    code: "INTERNAL_ERROR",
    cause: error,
  });
};

export const errorHandler = (error, request, response, _next) => {
  const normalized = normalizeError(error);
  const logPayload = {
    error,
    requestId: request.id,
    code: normalized.code,
    statusCode: normalized.statusCode,
  };

  if (normalized.statusCode >= 500) logger.error(normalized.message, logPayload);
  else logger.warn(normalized.message, logPayload);

  const details =
    normalized.statusCode < 500 || env.NODE_ENV !== "production" ? normalized.details : undefined;

  response.status(normalized.statusCode).json(
    ApiResponse.error({
      message: normalized.message,
      code: normalized.code,
      details,
      requestId: request.id,
    }),
  );
};
