import { z } from "zod";

export const idParamSchema = z.object({
  body: z.unknown().optional(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

export const listQuerySchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
      search: z.string().trim().max(191).optional(),
      sortBy: z.string().trim().max(100).optional(),
      sortDirection: z.enum(["ASC", "DESC", "asc", "desc"]).default("DESC"),
    })
    .passthrough(),
});
