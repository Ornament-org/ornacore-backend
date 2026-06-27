import { z } from "zod";
import { idParamSchema } from "../../shared/http/crud.validation.js";

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const listAttributeQuerySchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(200).default(50),
    search: z.string().trim().max(100).optional(),
  }),
});

const valueInput = z.object({
  value: z.string().trim().min(1).max(200),
  displayOrder: z.coerce.number().int().nonnegative().optional(),
});

export const createAttributeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    displayOrder: z.coerce.number().int().nonnegative().default(0),
    values: z.array(valueInput).max(200).default([]),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateAttributeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    displayOrder: z.coerce.number().int().nonnegative().optional(),
  }).refine((b) => Object.keys(b).length > 0, "At least one field is required"),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const createValueSchema = z.object({
  body: valueInput,
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const updateValueSchema = z.object({
  body: z.object({
    value: z.string().trim().min(1).max(200).optional(),
    displayOrder: z.coerce.number().int().nonnegative().optional(),
  }).refine((b) => Object.keys(b).length > 0, "At least one field is required"),
  params: z.object({
    id: z.coerce.number().int().positive(),
    valueId: z.coerce.number().int().positive(),
  }),
  query: z.object({}).passthrough(),
});

export const valueIdParamSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({
    id: z.coerce.number().int().positive(),
    valueId: z.coerce.number().int().positive(),
  }),
  query: z.object({}).passthrough(),
});

export const syncVariantAttributesSchema = z.object({
  body: z.object({
    attributeValueIds: z.array(z.coerce.number().int().positive()).max(50).default([]),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});
