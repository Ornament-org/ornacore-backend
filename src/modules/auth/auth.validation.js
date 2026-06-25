import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .max(72, "Password cannot exceed 72 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

const emailSchema = z
  .email()
  .max(191)
  .transform((value) => value.trim().toLowerCase());

const mobileSchema = z
  .string()
  .min(8)
  .max(32)
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine((value) => /^\+?[0-9]{8,15}$/.test(value), "Mobile number format is invalid");

const emptyRequestParts = {
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
};

const addressSchema = z.object({
  label: z.string().trim().min(2).max(100).default("Primary"),
  contactName: z.string().trim().min(2).max(191).optional(),
  contactMobile: mobileSchema.optional(),
  addressLine1: z.string().trim().min(3).max(255),
  addressLine2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().trim().min(4).max(12),
  country: z.string().trim().min(2).max(80).default("India"),
});

export const adminLoginSchema = z.object({
  ...emptyRequestParts,
  body: z.object({
    email: emailSchema,
    password: z.string().min(1).max(72),
  }),
});

export const shopkeeperLoginSchema = z.object({
  ...emptyRequestParts,
  body: z.object({
    identifier: z.string().trim().min(3).max(191),
    password: z.string().min(1).max(72),
  }),
});

export const shopkeeperRegistrationSchema = z.object({
  ...emptyRequestParts,
  body: z
    .object({
      ownerName: z.string().trim().min(2).max(191),
      shopName: z.string().trim().min(2).max(191),
      email: emailSchema.optional(),
      mobile: mobileSchema.optional(),
      password: passwordSchema,
      address: addressSchema.optional(),
      addressLine1: z.string().trim().min(3).max(255).optional(),
      addressLine2: z.string().trim().max(255).optional(),
      city: z.string().trim().min(2).max(120).optional(),
      state: z.string().trim().min(2).max(120).optional(),
      pincode: z.string().trim().min(4).max(12).optional(),
      gstNumber: z.string().trim().toUpperCase().max(32).optional(),
      businessType: z.string().trim().max(100).optional(),
    })
    .refine(({ email, mobile }) => email || mobile, {
      message: "Either email or mobile is required",
      path: ["email"],
    })
    .refine(({ address, addressLine1, city, state, pincode }) => {
      return address || (addressLine1 && city && state && pincode);
    }, {
      message: "Shop address is required",
      path: ["address"],
    }),
});

export const refreshTokenSchema = z.object({
  ...emptyRequestParts,
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const emptyBodySchema = z.object({
  ...emptyRequestParts,
  body: z.object({}).passthrough(),
});

export const changePasswordSchema = z.object({
  ...emptyRequestParts,
  body: z.object({
    currentPassword: z.string().min(1).max(72),
    newPassword: passwordSchema,
  }),
});
