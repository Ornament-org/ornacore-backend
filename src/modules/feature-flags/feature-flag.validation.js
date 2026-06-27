import { z } from "zod";

const bodySchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .transform((v) => v.toLowerCase().replace(/\s+/g, "_"))
    .refine((v) => /^[a-z0-9_.-]+$/.test(v), "Key must be lowercase alphanumeric with _ . - only"),
  name: z.string().trim().min(2).max(200),
  module: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  isEnabled: z.boolean().optional(),
  environment: z.enum(["all", "web", "mobile", "server"]).optional(),
  targetAudience: z.enum(["all", "admin", "shopkeeper"]).optional(),
  rolloutPercentage: z.coerce.number().int().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const createFlagSchema = z.object({
  body: bodySchema,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateFlagSchema = z.object({
  body: bodySchema.partial().refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const listFlagQuerySchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
      search: z.string().trim().max(191).optional(),
      isEnabled: z.enum(["true", "false"]).optional(),
      environment: z.enum(["all", "web", "mobile", "server"]).optional(),
      module: z.string().trim().max(100).optional(),
    })
    .passthrough(),
});
