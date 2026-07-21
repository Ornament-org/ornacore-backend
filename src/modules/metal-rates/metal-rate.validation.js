import { z } from "zod";

export const upsertMetalRateSchema = z.object({
  params: z.object({ metalId: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
  body: z.object({
    basePricePerGram: z.coerce.number().nonnegative(),
    extraPerGram: z.coerce.number().nonnegative().default(0),
  }),
});

export const emptyMetalRateQuerySchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z.unknown().optional(),
});
