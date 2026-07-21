import { z } from "zod";

const bodySchema = z
  .object({
    businessName: z.string().trim().min(1).max(200).nullable().optional(),
    displayName: z.string().trim().min(1).max(200).nullable().optional(),
    logo: z.string().trim().max(2000).nullable().optional(),
    favicon: z.string().trim().max(2000).nullable().optional(),
    currency: z.string().trim().min(1).max(10).optional(),
    timezone: z.string().trim().min(1).max(50).optional(),
    dateFormat: z.string().trim().min(1).max(30).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field must be provided" });

export const updateStoreSettingsSchema = z.object({
  body: bodySchema,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});
