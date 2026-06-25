import { z } from "zod";

export const priceGroupBodySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const pricingRuleBodySchema = z.object({
  productId: z.coerce.number().int().positive().nullable().optional(),
  productVariantId: z.coerce.number().int().positive().nullable().optional(),
  priceGroupId: z.coerce.number().int().positive().nullable().optional(),
  ruleType: z.enum([
    "FIXED",
    "METAL_RATE_BASED",
    "PERCENTAGE_MARGIN",
    "PERCENTAGE_DISCOUNT",
    "BULK",
  ]),
  basePrice: z.coerce.number().nonnegative().nullable().optional(),
  makingCharge: z.coerce.number().nonnegative().nullable().optional(),
  percentageValue: z.coerce.number().nullable().optional(),
  minimumQuantity: z.coerce.number().positive().nullable().optional(),
  configuration: z.record(z.string(), z.unknown()).nullable().optional(),
  priority: z.coerce.number().int().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const shopkeeperPriceOverrideBodySchema = z.object({
  shopkeeperId: z.coerce.number().int().positive(),
  productVariantId: z.coerce.number().int().positive(),
  overridePrice: z.coerce.number().positive(),
  reason: z.string().trim().max(500).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

const createBodySchema = (body) =>
  z.object({
    body,
    params: z.object({}).passthrough(),
    query: z.object({}).passthrough(),
  });

const updateBodySchema = (body) =>
  z.object({
    body: body.partial().refine((value) => Object.keys(value).length > 0, {
      message: "At least one field must be provided",
    }),
    params: z.object({ id: z.coerce.number().int().positive() }),
    query: z.object({}).passthrough(),
  });

export const createPriceGroupSchema = createBodySchema(priceGroupBodySchema);
export const updatePriceGroupSchema = updateBodySchema(priceGroupBodySchema);
export const createPricingRuleSchema = createBodySchema(pricingRuleBodySchema);
export const updatePricingRuleSchema = updateBodySchema(pricingRuleBodySchema);
export const createShopkeeperPriceOverrideSchema = createBodySchema(
  shopkeeperPriceOverrideBodySchema,
);
export const updateShopkeeperPriceOverrideSchema = updateBodySchema(
  shopkeeperPriceOverrideBodySchema,
);
