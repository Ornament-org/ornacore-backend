import { z } from "zod";

export const adjustmentSchema = z.object({
  body: z.object({
    movementType: z.enum([
      "STOCK_IN",
      "STOCK_OUT",
      "ADJUSTMENT",
      "RESERVATION",
      "RESERVATION_RELEASE",
      "DAMAGED",
      "RETURNED",
    ]),
    quantity: z.coerce.number().nonnegative(),
    reason: z.string().trim().min(3).max(500),
    referenceType: z.string().trim().max(100).nullable().optional(),
    referenceId: z.coerce.number().int().positive().nullable().optional(),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});
