import { z } from "zod";

const STATUSES = ["ACTIVE", "INACTIVE"];
const keyPattern = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

export const placeholderBodySchema = z.object({
  name: z.string().trim().min(2).max(150),
  key: z.string().trim().min(2).max(100).regex(keyPattern, "Use lowercase letters, numbers, - or _"),
  description: z.string().trim().max(500).nullable().optional(),
  status: z.enum(STATUSES).optional(),
});

export const createPlaceholderSchema = z.object({
  body: placeholderBodySchema,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updatePlaceholderSchema = z.object({
  body: placeholderBodySchema
    .omit({ key: true })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field must be provided",
    }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const placeholderIdSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const placeholderListSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      search: z.string().trim().max(180).optional(),
      status: z.enum(STATUSES).optional(),
    })
    .passthrough(),
});
