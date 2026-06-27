import { z } from "zod";
import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { roleController } from "./role.controller.js";

export const roleAdminRouter = createModuleRouter();

const roleBody = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  permissionIds: z.array(z.coerce.number().int().positive()).default([]),
});

const createSchema = z.object({
  body: roleBody,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const updateSchema = z.object({
  body: roleBody.partial(),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

roleAdminRouter.use(...protectAdmin(PERMISSIONS.ROLE_MANAGE));

roleAdminRouter.get(
  "/",
  asyncHandler(roleController.list),
);

roleAdminRouter.post(
  "/",
  validate(createSchema),
  asyncHandler(roleController.create),
);

roleAdminRouter.patch(
  "/:id",
  validate(updateSchema),
  asyncHandler(roleController.update),
);

roleAdminRouter.delete(
  "/:id",
  validate(idParamSchema),
  asyncHandler(roleController.remove),
);
