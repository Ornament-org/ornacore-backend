import { z } from "zod";

export const approvalSchema = z.object({
  body: z.object({
    creditLimits: z
      .array(
        z.object({
          metalId: z.coerce.number().int().positive(),
          creditLimitGrams: z.coerce.number().nonnegative(),
        }),
      )
      .optional()
      .default([]),
    assignedSalespersonId: z.coerce.number().int().positive().nullable().optional(),
    internalNote: z.string().trim().max(1000).nullable().optional(),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const reasonSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(3).max(1000),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const addressBody = z.object({
  label: z.string().trim().min(2).max(100).default("Primary"),
  contactName: z.string().trim().min(2).max(191).nullable().optional(),
  contactMobile: z.string().trim().max(32).nullable().optional(),
  addressLine1: z.string().trim().min(3).max(255),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().trim().min(4).max(12),
  country: z.string().trim().min(2).max(80).default("India"),
  isPrimary: z.boolean().optional(),
});

export const shopkeeperUpdateBody = z.object({
  ownerName: z.string().trim().min(2).max(191).optional(),
  shopName: z.string().trim().min(2).max(191).optional(),
  addressLine1: z.string().trim().max(255).nullable().optional(),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(120).nullable().optional(),
  pincode: z.string().trim().max(12).nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  gstNumber: z.string().trim().max(32).nullable().optional(),
  businessType: z.string().trim().max(100).nullable().optional(),
  creditLimits: z
    .array(
      z.object({
        metalId: z.coerce.number().int().positive(),
        creditLimitGrams: z.coerce.number().nonnegative(),
      }),
    )
    .optional(),
  assignedSalespersonId: z.coerce.number().int().positive().nullable().optional(),
  isOrderAllowed: z.boolean().optional(),
});

export const updateSchema = z.object({
  body: shopkeeperUpdateBody.refine((value) => Object.keys(value).length > 0),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const updateMyProfileSchema = z.object({
  body: shopkeeperUpdateBody
    .omit({
      creditLimits: true,
      assignedSalespersonId: true,
      isOrderAllowed: true,
    })
    .refine((value) => Object.keys(value).length > 0),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const upsertAddressSchema = z.object({
  body: addressBody,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const submitForApprovalSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});
