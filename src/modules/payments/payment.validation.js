import { z } from "zod";
import { PAYMENT_METHODS, PAYMENT_TRANSACTION_STATUSES } from "../../constants/app.constants.js";

export const paymentSchema = z.object({
  body: z.object({
    orderId: z.coerce.number().int().positive().nullable().optional(),
    shopkeeperId: z.coerce.number().int().positive(),
    method: z.enum(Object.values(PAYMENT_METHODS)),
    amount: z.coerce.number().positive(),
    externalReference: z.string().trim().max(191).nullable().optional(),
    receivedAt: z.coerce.date().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const statusSchema = z.object({
  body: z.object({
    status: z.enum(Object.values(PAYMENT_TRANSACTION_STATUSES)),
    notes: z.string().trim().max(5000).nullable().optional(),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});
