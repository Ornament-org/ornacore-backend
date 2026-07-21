import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { mediaStorageService } from "../../integrations/media/media-storage.service.js";
import { AppError } from "../../shared/errors/AppError.js";

const getOrThrow = async (id, { includeTrashed = false } = {}) => {
  const media = await db.Media.findByPk(id, { paranoid: !includeTrashed });
  if (!media) {
    throw new AppError("Media not found", { statusCode: 404, code: "MEDIA_NOT_FOUND" });
  }
  return media;
};

export const mediaService = {
  // Backs the Media Library grid — search/type/folder filters plus a library-vs-trash
  // toggle. `trashed` intentionally disables Sequelize's default paranoid exclusion so
  // the Trash tab can see soft-deleted rows; the Library tab relies on that same
  // paranoid default to hide them without any extra where-clause.
  async list({ page = 1, limit = 24, search, folderId, mimeType, trashed = false } = {}) {
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 24, 1), 100);
    const isTrashed = trashed === true || trashed === "true";
    const where = {};

    if (isTrashed) where.deletedAt = { [Op.ne]: null };
    if (folderId !== undefined && folderId !== "" && folderId !== null) where.folderId = folderId;
    if (mimeType) where.mimeType = { [Op.like]: `${mimeType}%` };
    if (search?.trim()) {
      const term = `%${search.trim().slice(0, 100)}%`;
      where[Op.or] = [
        { originalFilename: { [Op.like]: term } },
        { altText: { [Op.like]: term } },
      ];
    }

    const { count, rows } = await db.Media.findAndCountAll({
      where,
      paranoid: !isTrashed,
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    return {
      files: rows,
      pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) },
    };
  },

  async getById(id) {
    return getOrThrow(id);
  },

  // Updates alt text / folder placement only — asset bytes and the stored URL are
  // immutable once uploaded.
  async update(id, { altText, folderId }) {
    const media = await getOrThrow(id);
    const values = {};
    if (altText !== undefined) values.altText = altText || null;
    if (folderId !== undefined) values.folderId = folderId || null;
    await media.update(values);
    return media;
  },

  // Reversible — never touches storage, just sets deleted_at (paranoid soft delete).
  async trash(id) {
    const media = await getOrThrow(id);
    await media.destroy();
    return media;
  },

  async restore(id) {
    const media = await getOrThrow(id, { includeTrashed: true });
    await media.restore();
    return media;
  },

  // Hard delete. Storage cleanup is best-effort — a flaky/timed-out provider call must
  // never block removing the record, which is the admin's actual intent.
  async purge(id) {
    const media = await getOrThrow(id, { includeTrashed: true });
    try {
      await mediaStorageService.destroy(media.publicId);
    } catch {
      // ignore — see comment above
    }
    await media.destroy({ force: true });
  },

  async listFolders() {
    return db.MediaFolder.findAll({ order: [["name", "ASC"]] });
  },

  async createFolder({ name, parentId, userId }) {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new AppError("Folder name is required", { statusCode: 422, code: "FOLDER_NAME_REQUIRED" });
    }
    return db.MediaFolder.create({ name: trimmed, parentId: parentId || null, createdByUserId: userId || null });
  },

  async updateFolder(id, { name, parentId }) {
    const folder = await db.MediaFolder.findByPk(id);
    if (!folder) {
      throw new AppError("Folder not found", { statusCode: 404, code: "FOLDER_NOT_FOUND" });
    }
    const values = {};
    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new AppError("Folder name cannot be empty", { statusCode: 422, code: "FOLDER_NAME_REQUIRED" });
      }
      values.name = trimmed;
    }
    if (parentId !== undefined) values.parentId = parentId || null;
    await folder.update(values);
    return folder;
  },

  // Deletes the folder itself but keeps its files — they just become unfiled.
  async deleteFolder(id) {
    const folder = await db.MediaFolder.findByPk(id);
    if (!folder) {
      throw new AppError("Folder not found", { statusCode: 404, code: "FOLDER_NOT_FOUND" });
    }
    await db.Media.update({ folderId: null }, { where: { folderId: id } });
    await folder.destroy();
  },
};
