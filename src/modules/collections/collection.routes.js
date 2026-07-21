import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { collectionController } from "./collection.controller.js";
import {
  collectionIdSchema,
  collectionListSchema,
  createCollectionSchema,
  publicCollectionListSchema,
  updateCollectionSchema,
} from "./collection.validation.js";

export const collectionAdminRouter = createModuleRouter();
export const collectionPublicRouter = createModuleRouter();

collectionAdminRouter.get("/", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), validate(collectionListSchema), asyncHandler(collectionController.list));
collectionAdminRouter.get("/:id", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), validate(collectionIdSchema), asyncHandler(collectionController.getById));
collectionAdminRouter.post("/", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), validate(createCollectionSchema), asyncHandler(collectionController.create));
collectionAdminRouter.patch("/:id", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), validate(updateCollectionSchema), asyncHandler(collectionController.update));
collectionAdminRouter.delete("/:id", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), validate(collectionIdSchema), asyncHandler(collectionController.remove));

// Fully unauthenticated — active collections for the storefront home page row.
collectionPublicRouter.get(
  "/",
  validate(publicCollectionListSchema),
  asyncHandler(collectionController.publicList),
);
