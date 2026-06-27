import { z } from "zod";

export const metalBodySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.coerce.number().int().nonnegative().optional(),
  rateUnit: z.enum(["PER_10G", "PER_KG", "PER_G"]).optional(),
});

export const createMetalSchema = z.object({
  body: metalBodySchema,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateMetalSchema = z.object({
  body: metalBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});
