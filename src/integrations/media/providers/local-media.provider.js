import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/AppError.js";

const extensionByMimeType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "application/pdf": ".pdf",
};

const safeFolder = (folder) =>
  String(folder || "misc")
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/") || "misc";

const localUploadRoot = path.resolve(env.LOCAL_UPLOAD_DIR);

export const localMediaProvider = {
  name: "local",

  isConfigured() {
    return Boolean(env.LOCAL_UPLOAD_DIR);
  },

  async uploadBuffer(buffer, { folder, mimeType, resourceType = "image" }) {
    const normalizedFolder = safeFolder(folder);
    const extension = extensionByMimeType[mimeType] ?? "";
    const filename = `${randomUUID()}${extension}`;
    const relativePath = path.join(normalizedFolder, filename);
    const absolutePath = path.join(localUploadRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);

    const portableRelativePath = relativePath.split(path.sep).join("/");
    const publicPath = portableRelativePath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");

    return {
      provider: this.name,
      publicId: `local/${portableRelativePath}`,
      secureUrl: `${env.APP_BASE_URL.replace(/\/$/, "")}/uploads/${publicPath}`,
      resourceType,
      folder: `local/${normalizedFolder}`,
      width: null,
      height: null,
      metadata: { local: true },
    };
  },

  async destroy(publicId) {
    const relativePath = publicId.replace(/^local\//, "");
    const absolutePath = path.resolve(localUploadRoot, relativePath);

    if (!absolutePath.startsWith(`${localUploadRoot}${path.sep}`)) {
      throw new AppError("Invalid local media path", {
        statusCode: 400,
        code: "INVALID_MEDIA_PATH",
      });
    }

    await unlink(absolutePath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });

    return { result: "ok" };
  },
};
