import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { productController } from "./product.controller.js";
import {
  createSchema,
  updateSchema,
  imageSchema,
  imageIdSchema,
  slugParamSchema,
  bulkDeleteSchema,
} from "./product.validation.js";

export const productAdminRouter = createModuleRouter();
export const productShopkeeperRouter = createModuleRouter();
export const productPublicRouter = createModuleRouter();

productAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.PRODUCT_MANAGE),
  validate(listQuerySchema),
  asyncHandler(productController.adminList),
);

productAdminRouter.get(
  "/:id",
  ...protectAdmin(PERMISSIONS.PRODUCT_MANAGE),
  validate(idParamSchema),
  asyncHandler(productController.adminGetById),
);

productAdminRouter.post(
  "/",
  ...protectAdmin(PERMISSIONS.PRODUCT_MANAGE),
  validate(createSchema),
  asyncHandler(productController.adminCreate),
);

productAdminRouter.patch(
  "/:id",
  ...protectAdmin(PERMISSIONS.PRODUCT_MANAGE),
  validate(updateSchema),
  asyncHandler(productController.adminUpdate),
);

// Registered before "/:id" — otherwise Express would match "bulk" as the
// :id param and fail idParamSchema's numeric coercion before ever reaching
// the bulk handler.
productAdminRouter.delete(
  "/bulk",
  ...protectAdmin(PERMISSIONS.PRODUCT_MANAGE),
  validate(bulkDeleteSchema),
  asyncHandler(productController.adminBulkDelete),
);

productAdminRouter.delete(
  "/:id",
  ...protectAdmin(PERMISSIONS.PRODUCT_MANAGE),
  validate(idParamSchema),
  asyncHandler(productController.adminDelete),
);

productAdminRouter.post(
  "/:id/images",
  ...protectAdmin(PERMISSIONS.PRODUCT_MANAGE),
  validate(imageSchema),
  asyncHandler(productController.adminAddImages),
);

productAdminRouter.delete(
  "/:id/images/:imageId",
  ...protectAdmin(PERMISSIONS.PRODUCT_MANAGE),
  validate(imageIdSchema),
  asyncHandler(productController.adminDeleteImage),
);

productShopkeeperRouter.get(
  "/",
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
  asyncHandler(productController.shopkeeperList),
);

productShopkeeperRouter.get(
  "/slug/:slug",
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
  validate(slugParamSchema),
  asyncHandler(productController.shopkeeperGetBySlug),
);

// Fully unauthenticated — active products with a login-free reference price, for the
// public storefront (see productController.publicList / pricingService.calculatePublicPrice).
productPublicRouter.get("/", asyncHandler(productController.publicList));

productPublicRouter.get(
  "/slug/:slug",
  validate(slugParamSchema),
  asyncHandler(productController.publicGetBySlug),
);
