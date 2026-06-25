import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { productVariantController } from "./product-variant.controller.js";
import {
  createProductVariantSchema,
  updateProductVariantSchema,
} from "./product-variant.validation.js";

export const productVariantAdminRouter = createModuleRouter();

productVariantAdminRouter.use(...protectAdmin(PERMISSIONS.PRODUCT_MANAGE));

productVariantAdminRouter.get(
  "/",
  validate(listQuerySchema),
  asyncHandler(productVariantController.list),
);
productVariantAdminRouter.get(
  "/:id",
  validate(idParamSchema),
  asyncHandler(productVariantController.getById),
);
productVariantAdminRouter.post(
  "/",
  validate(createProductVariantSchema),
  asyncHandler(productVariantController.create),
);
productVariantAdminRouter.patch(
  "/:id",
  validate(updateProductVariantSchema),
  asyncHandler(productVariantController.update),
);
productVariantAdminRouter.delete(
  "/:id",
  validate(idParamSchema),
  asyncHandler(productVariantController.remove),
);
