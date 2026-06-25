import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import { cloudinaryService } from "../cloudinary/cloudinary.service.js";
import { localMediaProvider } from "./providers/local-media.provider.js";

const providers = new Map([
  [localMediaProvider.name, localMediaProvider],
  [cloudinaryService.name, cloudinaryService],
]);

const getProvider = (providerName) => {
  const provider = providers.get(providerName);
  if (!provider) {
    throw new AppError(`Unsupported media storage provider: ${providerName}`, {
      statusCode: 503,
      code: "MEDIA_PROVIDER_NOT_SUPPORTED",
    });
  }
  if (!provider.isConfigured()) {
    throw new AppError(`${providerName} media storage is not fully configured`, {
      statusCode: 503,
      code: "MEDIA_PROVIDER_NOT_CONFIGURED",
      details: { provider: providerName },
    });
  }
  return provider;
};

const inferProviderName = (publicId) => {
  if (publicId?.startsWith("local/")) return localMediaProvider.name;
  return cloudinaryService.name;
};

export const mediaStorageService = {
  get activeProviderName() {
    return env.MEDIA_STORAGE_PROVIDER;
  },

  async uploadBuffer(buffer, options) {
    return getProvider(env.MEDIA_STORAGE_PROVIDER).uploadBuffer(buffer, options);
  },

  async destroy(publicId, { provider, ...options } = {}) {
    const providerName = provider || inferProviderName(publicId);
    return getProvider(providerName).destroy(publicId, options);
  },
};
