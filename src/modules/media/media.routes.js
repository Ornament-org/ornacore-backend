import { PERMISSIONS } from "../../constants/permissions.js";
import { mediaStorageService } from "../../integrations/media/media-storage.service.js";
import { AppError } from "../../shared/errors/AppError.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import db from "../../database/models/InitializeModels.js";
import { createModuleRouter } from "../module.router.js";
import { mediaUpload } from "./media.upload.middleware.js";

export const mediaAdminRouter = createModuleRouter();

mediaAdminRouter.use(...protectAdmin(PERMISSIONS.MEDIA_MANAGE));

const parseOwner = (value) => {
  if (!value) return {};

  try {
    const owner = JSON.parse(value);
    if (!owner || Array.isArray(owner) || typeof owner !== "object") {
      throw new TypeError("Owner must be an object");
    }
    return owner;
  } catch (error) {
    throw new AppError("The media owner payload must be valid JSON.", {
      statusCode: 400,
      code: "INVALID_MEDIA_OWNER",
      details: { field: "owner" },
      cause: error,
    });
  }
};

mediaAdminRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const rows = await db.Media.findAll({
      order: [["createdAt", "DESC"]],
      limit: Math.min(Number(request.query.limit) || 50, 100),
    });
    response.json(ApiResponse.success({ data: rows }));
  }),
);

mediaAdminRouter.post(
  "/",
  mediaUpload.array("files", 10),
  asyncHandler(async (request, response) => {
    if (!request.files?.length) {
      throw new AppError("At least one media file is required.", {
        statusCode: 422,
        code: "MEDIA_FILE_REQUIRED",
        details: { field: "files" },
      });
    }

    const owner = parseOwner(request.body.owner);
    const uploaded = [];

    for (const file of request.files ?? []) {
      const result = await mediaStorageService.uploadBuffer(file.buffer, {
        folder: owner.folder || "misc",
        resourceType: file.mimetype === "application/pdf" ? "raw" : "image",
        mimeType: file.mimetype,
      });
      const media = await db.Media.create({
        publicId: result.publicId,
        secureUrl: result.secureUrl,
        resourceType: result.resourceType,
        folder: result.folder,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        width: result.width ?? null,
        height: result.height ?? null,
        uploadedByUserId: request.auth.sub,
        ownerType: owner.ownerType ?? null,
        ownerId: owner.ownerId ?? null,
        metadata: {
          provider: result.provider,
          ...result.metadata,
        },
      });
      uploaded.push(media);
    }

    response.status(201).json(
      ApiResponse.success({
        message:
          uploaded.length === 1
            ? "Media file uploaded successfully"
            : `${uploaded.length} media files uploaded successfully`,
        data: uploaded,
      }),
    );
  }),
);
