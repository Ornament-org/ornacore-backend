import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .max(72, "Password cannot exceed 72 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const createSuperAdminSchema = z.object({
  body: z.object({
    email: z
      .email()
      .max(191)
      .transform((value) => value.trim().toLowerCase()),
    password: strongPassword,
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});
