import { z } from "zod";

export const productVariantBodySchema = z.object({
  productId: z.coerce.number().int().positive(),
  sku: z.string().trim().min(2).max(100),
  name: z.string().trim().max(191).nullable().optional(),
  purity: z.string().trim().max(50).nullable().optional(),
  karat: z.coerce.number().positive().nullable().optional(),
  tunch: z.coerce.number().min(0).max(100).nullable().optional(),
  weightGrams: z.coerce.number().nonnegative().nullable().optional(),
  minimumOrderQuantity: z.coerce.number().positive().optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createProductVariantSchema = z.object({
  body: productVariantBodySchema,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateProductVariantSchema = z.object({
  body: productVariantBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});
