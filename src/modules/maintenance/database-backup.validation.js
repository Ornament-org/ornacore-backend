import { z } from "zod";

export const emailDatabaseBackupSchema = z.object({
  body: z
    .object({
      email: z
        .email()
        .max(191)
        .transform((value) => value.trim().toLowerCase())
        .optional(),
    })
    .optional()
    .default({}),
});

export const getDatabaseBackupJobSchema = z.object({
  params: z.object({
    jobId: z.string().uuid(),
  }),
});
