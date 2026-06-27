import { z } from "zod";
import { ORDER_STATUSES } from "../../constants/app.constants.js";

export const createOrderSchema = z.object({
  body: z.object({
    shopkeeperId: z.coerce.number().int().positive(),
    assignedStaffId: z.coerce.number().int().positive().nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    items: z
      .array(
        z.object({
          productVariantId: z.coerce.number().int().positive(),
          quantity: z.coerce.number().positive(),
        }),
      )
      .min(1)
      .max(100),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const statusSchema = z.object({
  body: z.object({
    status: z.enum(Object.values(ORDER_STATUSES)),
    note: z.string().trim().max(500).nullable().optional(),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const assignSchema = z.object({
  body: z.object({
    assignedStaffId: z.coerce.number().int().positive().nullable(),
    note: z.string().trim().max(500).nullable().optional(),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const shopkeeperPlaceOrderSchema = z.object({
  body: z.object({
    notes: z.string().trim().max(5000).nullable().optional(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});
