import { z } from "zod";
import { CATEGORY_STATUSES } from "../../constants/app.constants.js";

const nullableId = z.coerce.number().int().positive().nullable().optional();

export const categoryBodySchema = z.object({
  parentId: nullableId,
  metalId: nullableId,
  name: z.string().trim().min(2).max(150),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  mediaId: nullableId,
  status: z.enum(Object.values(CATEGORY_STATUSES)).optional(),
  metaTitle: z.string().trim().max(180).nullable().optional(),
  metaDescription: z.string().trim().max(5000).nullable().optional(),
  ogMediaId: nullableId,
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const createCategorySchema = z.object({
  body: categoryBodySchema.omit({ status: true }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateCategorySchema = z.object({
  body: categoryBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const categoryIdSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const categoryListSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
      search: z.string().trim().max(180).optional(),
      status: z.enum(Object.values(CATEGORY_STATUSES)).optional(),
      parentId: z.union([z.literal("root"), z.coerce.number().int().positive()]).optional(),
      metalId: z.coerce.number().int().positive().nullable().optional(),
      sortBy: z.enum(["name", "sortOrder", "createdAt", "updatedAt"]).default("sortOrder"),
      sortDirection: z.enum(["ASC", "DESC", "asc", "desc"]).default("ASC"),
    })
    .passthrough(),
});
