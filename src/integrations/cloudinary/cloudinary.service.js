import { env } from "../../config/env.js";
import { cloudinary, isCloudinaryConfigured } from "../../config/cloudinary.js";
import { AppError } from "../../shared/errors/AppError.js";

const assertConfigured = () => {
  if (!isCloudinaryConfigured) {
    const missingConfiguration = [
      !env.CLOUDINARY_CLOUD_NAME && "CLOUDINARY_CLOUD_NAME",
      !env.CLOUDINARY_API_KEY && "CLOUDINARY_API_KEY",
      !env.CLOUDINARY_API_SECRET && "CLOUDINARY_API_SECRET",
    ].filter(Boolean);

    throw new AppError(
      `Cloudinary is not fully configured. Missing: ${missingConfiguration.join(", ")}.`,
      {
        statusCode: 503,
        code: "MEDIA_PROVIDER_NOT_CONFIGURED",
        details: { provider: "cloudinary", missingConfiguration },
      },
    );
  }
};

const sanitizeProviderMessage = (error) => {
  const message = String(error?.message || "Cloudinary rejected the request")
    .replaceAll(env.CLOUDINARY_API_KEY || "__unused_api_key__", "[REDACTED]")
    .replaceAll(env.CLOUDINARY_API_SECRET || "__unused_api_secret__", "[REDACTED]")
    .replace(/https?:\/\/\S+/gi, "[Cloudinary endpoint]");

  return message.slice(0, 300);
};

export const normalizeCloudinaryProviderError = (error, operation) => {
  if (error instanceof AppError) return error;

  const providerMessage = sanitizeProviderMessage(error);
  const providerStatus = Number(error?.http_code || error?.status || error?.statusCode);
  const networkCode = error?.code;
  const details = {
    provider: "cloudinary",
    operation,
    providerStatus: Number.isFinite(providerStatus) ? providerStatus : null,
    providerMessage,
  };

  if (
    providerStatus === 401 ||
    /unknown api key|invalid signature|authentication|api key/i.test(providerMessage)
  ) {
    return new AppError(
      "Cloudinary authentication failed. Check the Cloud Name, API Key, and API Secret.",
      {
        statusCode: 502,
        code: "CLOUDINARY_AUTHENTICATION_FAILED",
        details,
        cause: error,
      },
    );
  }

  if (providerStatus === 404 || /cloud name.*not found|unknown cloud/i.test(providerMessage)) {
    return new AppError("Cloudinary Cloud Name is invalid or does not exist.", {
      statusCode: 502,
      code: "CLOUDINARY_CLOUD_NOT_FOUND",
      details,
      cause: error,
    });
  }

  if (providerStatus === 413 || /file size|too large|maximum.*size/i.test(providerMessage)) {
    return new AppError("The uploaded file exceeds Cloudinary's allowed size.", {
      statusCode: 413,
      code: "CLOUDINARY_FILE_TOO_LARGE",
      details,
      cause: error,
    });
  }

  if (
    providerStatus === 420 ||
    providerStatus === 429 ||
    /rate limit|quota/i.test(providerMessage)
  ) {
    return new AppError("Cloudinary upload quota or rate limit has been reached.", {
      statusCode: 503,
      code: "CLOUDINARY_LIMIT_REACHED",
      details,
      cause: error,
    });
  }

  if (
    ["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT"].includes(networkCode) ||
    /network|timed out|timeout/i.test(providerMessage)
  ) {
    return new AppError("Cloudinary is currently unreachable. Please try again.", {
      statusCode: 503,
      code: "CLOUDINARY_UNAVAILABLE",
      details,
      cause: error,
    });
  }

  return new AppError(`Cloudinary ${operation} failed: ${providerMessage}`, {
    statusCode: 502,
    code: "CLOUDINARY_REQUEST_FAILED",
    details,
    cause: error,
  });
};

export const cloudinaryService = {
  name: "cloudinary",

  isConfigured() {
    return isCloudinaryConfigured;
  },

  async uploadBuffer(buffer, { folder, resourceType = "image" }) {
    assertConfigured();

    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${env.CLOUDINARY_ROOT_FOLDER}/${folder}`,
            resource_type: resourceType,
          },
          (error, uploadResult) => (error ? reject(error) : resolve(uploadResult)),
        );

        stream.on("error", reject);
        stream.end(buffer);
      });

      return {
        provider: "cloudinary",
        publicId: result.public_id,
        secureUrl: result.secure_url,
        resourceType: result.resource_type,
        folder: result.folder,
        width: result.width ?? null,
        height: result.height ?? null,
        metadata: result,
      };
    } catch (error) {
      throw normalizeCloudinaryProviderError(error, "upload");
    }
  },

  async destroy(publicId, { resourceType = "image" } = {}) {
    assertConfigured();
    try {
      return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
      throw normalizeCloudinaryProviderError(error, "deletion");
    }
  },
};
