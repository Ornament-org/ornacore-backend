import { z } from "zod";
import { PRODUCT_STATUSES } from "../../constants/app.constants.js";

export const variantSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  sku: z.string().trim().min(2).max(100),
  name: z.string().trim().max(191).nullable().optional(),
  purity: z.string().trim().max(50).nullable().optional(),
  karat: z.coerce.number().positive().nullable().optional(),
  tunch: z.coerce.number().min(0).max(100).nullable().optional(),
  weightGrams: z.coerce.number().nonnegative().nullable().optional(),
  minimumOrderQuantity: z.coerce.number().positive().default(1),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  isActive: z.boolean().optional(),
  basePrice: z.coerce.number().nonnegative().optional(),
  openingStock: z.coerce.number().nonnegative().optional(),
  reorderLevel: z.coerce.number().nonnegative().optional(),
});

export const categoryMappingsSchema = z
  .array(
    z.object({
      categoryId: z.coerce.number().int().positive(),
      isPrimary: z.boolean(),
      sortOrder: z.coerce.number().int().nonnegative().optional(),
    }),
  )
  .min(1, "At least one category is required")
  .max(50)
  .superRefine((mappings, context) => {
    const categoryIds = mappings.map(({ categoryId }) => categoryId);
    if (new Set(categoryIds).size !== categoryIds.length) {
      context.addIssue({
        code: "custom",
        message: "A category can be mapped only once",
      });
    }
    if (mappings.filter(({ isPrimary }) => isPrimary).length !== 1) {
      context.addIssue({
        code: "custom",
        message: "Exactly one product category must be primary",
      });
    }
  });

const productBody = z.object({
  metalId: z.coerce.number().int().positive(),
  categoryMappings: categoryMappingsSchema,
  designCode: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(191),
  slug: z.string().trim().max(220).optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  jewelryAttributes: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.enum(Object.values(PRODUCT_STATUSES)).default(PRODUCT_STATUSES.DRAFT),
  variants: z.array(variantSchema).min(1).max(50),
});

export const createSchema = z.object({
  body: productBody,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateSchema = z.object({
  body: productBody.partial().extend({
    variants: z.array(variantSchema).max(50).optional(),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const imageSchema = z.object({
  body: z.object({
    images: z
      .array(
        z.object({
          mediaId: z.coerce.number().int().positive(),
          productVariantId: z.coerce.number().int().positive().nullable().optional(),
          altText: z.string().trim().max(255).nullable().optional(),
          isPrimary: z.boolean().optional(),
          displayOrder: z.coerce.number().int().nonnegative().optional(),
        }),
      )
      .min(1)
      .max(20),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const imageIdSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({
    id: z.coerce.number().int().positive(),
    imageId: z.coerce.number().int().positive(),
  }),
  query: z.object({}).passthrough(),
});
