import { z } from "zod";

const nullableId = z.coerce.number().int().positive().nullable().optional();
const COLLECTION_STATUSES = ["ACTIVE", "INACTIVE"];
const COLLECTION_TYPES = ["CATEGORY", "PRODUCT"];

export const collectionBodySchema = z.object({
  name: z.string().trim().min(2).max(150),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  mediaId: nullableId,
  metalId: nullableId,
  type: z.enum(COLLECTION_TYPES).optional(),
  status: z.enum(COLLECTION_STATUSES).optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
  productIds: z.array(z.coerce.number().int().positive()).optional(),
  categoryIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const createCollectionSchema = z.object({
  body: collectionBodySchema.omit({ status: true }).extend({ type: z.enum(COLLECTION_TYPES) }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateCollectionSchema = z.object({
  body: collectionBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const collectionIdSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const collectionListSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
      search: z.string().trim().max(180).optional(),
      status: z.enum(COLLECTION_STATUSES).optional(),
      metalId: z.coerce.number().int().positive().optional(),
    })
    .passthrough(),
});

export const publicCollectionListSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      metalId: z.coerce.number().int().positive().optional(),
      // Comma-separated collection IDs, e.g. "3,7,2" — when given, restricts
      // to (and preserves the order of) exactly this set.
      ids: z
        .string()
        .trim()
        .min(1)
        .transform((value) =>
          value
            .split(",")
            .map((part) => Number(part.trim()))
            .filter((value_) => Number.isInteger(value_) && value_ > 0),
        )
        .optional(),
    })
    .passthrough(),
});
