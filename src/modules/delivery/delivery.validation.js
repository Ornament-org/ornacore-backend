import { z } from "zod";

export const deliveryBodySchema = z.object({
  orderId: z.coerce.number().int().positive(),
  status: z.enum([
    "PENDING",
    "READY",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "FAILED",
    "RETURNED",
  ]),
  courierName: z.string().trim().max(150).nullable().optional(),
  trackingNumber: z.string().trim().max(191).nullable().optional(),
  trackingUrl: z.url().nullable().optional(),
  dispatchedAt: z.coerce.date().nullable().optional(),
  estimatedDeliveryAt: z.coerce.date().nullable().optional(),
  deliveredAt: z.coerce.date().nullable().optional(),
  proofMediaId: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const createDeliverySchema = z.object({
  body: deliveryBodySchema,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateDeliverySchema = z.object({
  body: deliveryBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});
