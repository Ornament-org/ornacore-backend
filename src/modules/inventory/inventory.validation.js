import { z } from "zod";

const adjustmentBody = z.object({
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
});

export const adjustmentSchema = z.object({
  body: adjustmentBody,
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

// Adjusts by product variant instead of an existing Inventory row id — the
// row is created on first use (findOrCreate), so a variant that has never
// had stock counted yet can still be set without a separate "initialize
// inventory" step.
export const variantAdjustmentSchema = z.object({
  body: adjustmentBody,
  params: z.object({ variantId: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});
