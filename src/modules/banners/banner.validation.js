import { z } from "zod";

const STATUSES = ["ACTIVE", "INACTIVE"];
const nullableId = z.coerce.number().int().positive().nullable().optional();

export const bannerBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  subtitle: z.string().trim().max(300).nullable().optional(),
  placementId: z.coerce.number().int().positive(),
  metalId: nullableId,
  imageId: z.coerce.number().int().positive(),
  mobileImageId: nullableId,
  linkUrl: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(STATUSES).optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

export const createBannerSchema = z.object({
  body: bannerBodySchema.omit({ status: true }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateBannerSchema = z.object({
  body: bannerBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const bannerIdSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const bannerListSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
      search: z.string().trim().max(180).optional(),
      status: z.enum(STATUSES).optional(),
      placementId: z.coerce.number().int().positive().optional(),
      metalId: z.coerce.number().int().positive().optional(),
    })
    .passthrough(),
});

export const reorderBannersSchema = z.object({
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
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const publicBannerListSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      // Either look up by a named placement key (e.g. legacy/other pages),
      // or by an explicit, homepage-curated set of banner ids (comma-separated,
      // order preserved), optionally narrowed to a metal.
      placement: z.string().trim().min(1).max(100).optional(),
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
      metalId: z.coerce.number().int().positive().optional(),
    })
    .passthrough()
    .refine((value) => Boolean(value.placement) || Boolean(value.ids), {
      message: "Provide either placement or ids",
    }),
});
