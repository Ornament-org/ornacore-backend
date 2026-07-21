import { mediaStorageService } from "../../integrations/media/media-storage.service.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import db from "../../database/models/InitializeModels.js";
import { mediaService } from "./media.service.js";

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

const handleError = (response, error) => {
  response.status(error.statusCode || 500).json(
    ApiResponse.error({
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "An unexpected error occurred",
    }),
  );
};

// Backs the Media Library grid — search/type/folder filters plus a library-vs-trash toggle.
const list = async (request, response) => {
  try {
    const { page, limit, search, folderId, mimeType, trashed } = request.query;
    const { files, pagination } = await mediaService.list({ page, limit, search, folderId, mimeType, trashed });
    response.json(ApiResponse.success({ data: { files }, meta: { pagination } }));
  } catch (error) {
    handleError(response, error);
  }
};

const get = async (request, response) => {
  try {
    const media = await mediaService.getById(request.params.id);
    response.json(ApiResponse.success({ data: media }));
  } catch (error) {
    handleError(response, error);
  }
};

/*
  POST /admin/media  (multipart/form-data)
  files: <binary file(s)>
  owner: '{"ownerType":"Product","ownerId":5,"folder":"products","folderId":3,"altText":"..."}'  (optional JSON string)
*/
const upload = async (request, response) => {
  try {
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
        folderId: owner.folderId || null,
        altText: owner.altText || null,
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
  } catch (error) {
    handleError(response, error);
  }
};

const update = async (request, response) => {
  try {
    const media = await mediaService.update(request.params.id, {
      altText: request.body.altText,
      folderId: request.body.folderId,
    });
    response.json(ApiResponse.success({ message: "Media updated successfully", data: media }));
  } catch (error) {
    handleError(response, error);
  }
};

const trash = async (request, response) => {
  try {
    const media = await mediaService.trash(request.params.id);
    response.json(ApiResponse.success({ message: "Media moved to trash", data: media }));
  } catch (error) {
    handleError(response, error);
  }
};

const restore = async (request, response) => {
  try {
    const media = await mediaService.restore(request.params.id);
    response.json(ApiResponse.success({ message: "Media restored", data: media }));
  } catch (error) {
    handleError(response, error);
  }
};

const purge = async (request, response) => {
  try {
    await mediaService.purge(request.params.id);
    response.json(ApiResponse.success({ message: "Media permanently deleted" }));
  } catch (error) {
    handleError(response, error);
  }
};

const listFolders = async (request, response) => {
  try {
    const folders = await mediaService.listFolders();
    response.json(ApiResponse.success({ data: { folders } }));
  } catch (error) {
    handleError(response, error);
  }
};

const createFolder = async (request, response) => {
  try {
    const folder = await mediaService.createFolder({
      name: request.body.name,
      parentId: request.body.parentId,
      userId: request.auth?.sub,
    });
    response.status(201).json(ApiResponse.success({ message: "Folder created successfully", data: folder }));
  } catch (error) {
    handleError(response, error);
  }
};

const updateFolder = async (request, response) => {
  try {
    const folder = await mediaService.updateFolder(request.params.id, {
      name: request.body.name,
      parentId: request.body.parentId,
    });
    response.json(ApiResponse.success({ message: "Folder updated successfully", data: folder }));
  } catch (error) {
    handleError(response, error);
  }
};

const deleteFolder = async (request, response) => {
  try {
    await mediaService.deleteFolder(request.params.id);
    response.json(ApiResponse.success({ message: "Folder deleted successfully" }));
  } catch (error) {
    handleError(response, error);
  }
};

export const mediaController = {
  list,
  get,
  upload,
  update,
  trash,
  restore,
  purge,
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
};
