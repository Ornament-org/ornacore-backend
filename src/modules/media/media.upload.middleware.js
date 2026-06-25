import multer from "multer";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
]);

export const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 10,
  },
  fileFilter(_request, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new AppError("Unsupported file type", {
          statusCode: 415,
          code: "UNSUPPORTED_MEDIA_TYPE",
          details: { mimeType: file.mimetype },
        }),
      );
    }

    return callback(null, true);
  },
});
