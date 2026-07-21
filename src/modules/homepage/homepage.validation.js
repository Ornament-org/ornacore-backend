import { z } from "zod";
import { SECTION_TYPES } from "./homepage.defaults.js";

const idParam = z.coerce.number().int().positive();

export const listHomepagesSchema = z.object({
  params: z.object({}).passthrough(),
  query: z
    .object({
      audience: z.enum(["B2B", "B2C", "GLOBAL"]).optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      metalId: z.coerce.number().int().positive().optional(),
    })
    .passthrough(),
  body: z.unknown().optional(),
});

export const homepageIdSchema = z.object({
  params: z.object({ id: idParam }),
  query: z.object({}).passthrough(),
  body: z.unknown().optional(),
});

export const createHomepageSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.object({
    audienceType: z.enum(["B2B", "B2C", "GLOBAL"]),
    metalId: z.coerce.number().int().positive().nullable().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    homepageKey: z.string().trim().min(1).max(100).optional(),
  }),
});

export const updateHomepageSchema = z.object({
  params: z.object({ id: idParam }),
  query: z.object({}).passthrough(),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    isDefault: z.boolean().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  }),
});

export const createSectionSchema = z.object({
  params: z.object({ id: idParam }),
  query: z.object({}).passthrough(),
  body: z.object({
    sectionType: z.enum(SECTION_TYPES),
    sectionKey: z.string().trim().min(1).max(100).optional(),
    title: z.string().trim().max(200).nullable().optional(),
    subtitle: z.string().trim().max(300).nullable().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateSectionSchema = z.object({
  params: z.object({ id: idParam, sectionId: idParam }),
  query: z.object({}).passthrough(),
  body: z.object({
    title: z.string().trim().max(200).nullable().optional(),
    subtitle: z.string().trim().max(300).nullable().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().nonnegative().optional(),
  }),
});

export const sectionIdSchema = z.object({
  params: z.object({ id: idParam, sectionId: idParam }),
  query: z.object({}).passthrough(),
  body: z.unknown().optional(),
});

export const reorderSectionsSchema = z.object({
  params: z.object({ id: idParam }),
  query: z.object({}).passthrough(),
  body: z.object({
    order: z
      .array(
        z.object({
          id: z.coerce.number().int().positive(),
          sortOrder: z.coerce.number().int().nonnegative(),
        }),
      )
      .min(1),
  }),
});

export const resolveHomepageSchema = z.object({
  params: z.object({}).passthrough(),
  query: z
    .object({
      audience: z.enum(["B2B", "B2C"]).default("B2B"),
      metalId: z.coerce.number().int().positive().optional(),
    })
    .passthrough(),
  body: z.unknown().optional(),
});
