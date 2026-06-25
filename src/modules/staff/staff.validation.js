import { z } from "zod";
import { ACTOR_TYPES, USER_STATUSES } from "../../constants/app.constants.js";

const staffBody = z.object({
  fullName: z.string().trim().min(2).max(191),
  email: z
    .email()
    .max(191)
    .transform((value) => value.toLowerCase()),
  mobile: z.string().trim().max(32).nullable().optional(),
  designation: z.string().trim().max(120).nullable().optional(),
  joinedAt: z.coerce.date().nullable().optional(),
  actorType: z.enum([ACTOR_TYPES.ADMIN, ACTOR_TYPES.STAFF]).default(ACTOR_TYPES.STAFF),
  roleId: z.coerce.number().int().positive().optional(),
});

export const createStaffSchema = z.object({
  body: staffBody,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateStaffSchema = z.object({
  body: staffBody.partial().extend({ status: z.enum(Object.values(USER_STATUSES)).optional() }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const resetStaffPasswordSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});
