import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { attributeController } from "./attribute.controller.js";
import {
  createAttributeSchema,
  createValueSchema,
  listAttributeQuerySchema,
  syncVariantAttributesSchema,
  updateAttributeSchema,
  updateValueSchema,
  valueIdParamSchema,
} from "./attribute.validation.js";

export const attributeAdminRouter = createModuleRouter();

// attributeAdminRouter.use(...protectAdmin(PERMISSIONS.CATALOG_MANAGE)); // TODO: re-enable after testing

// Variant attribute sync — must be before /:id to avoid "variant" being captured as id
attributeAdminRouter.get("/variant/:id", validate(idParamSchema), asyncHandler(attributeController.getVariantAttributes));
attributeAdminRouter.post("/variant/:id/sync", validate(syncVariantAttributesSchema), asyncHandler(attributeController.syncVariantAttributes));

// Attribute CRUD
attributeAdminRouter.get("/", validate(listAttributeQuerySchema), asyncHandler(attributeController.list));
attributeAdminRouter.post("/", validate(createAttributeSchema), asyncHandler(attributeController.create));
attributeAdminRouter.get("/:id", validate(idParamSchema), asyncHandler(attributeController.getById));
attributeAdminRouter.patch("/:id", validate(updateAttributeSchema), asyncHandler(attributeController.update));
attributeAdminRouter.delete("/:id", validate(idParamSchema), asyncHandler(attributeController.remove));

// Attribute value CRUD (nested under attribute)
attributeAdminRouter.post("/:id/values", validate(createValueSchema), asyncHandler(attributeController.createValue));
attributeAdminRouter.patch("/:id/values/:valueId", validate(updateValueSchema), asyncHandler(attributeController.updateValue));
attributeAdminRouter.delete("/:id/values/:valueId", validate(valueIdParamSchema), asyncHandler(attributeController.removeValue));
