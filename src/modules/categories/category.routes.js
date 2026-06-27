import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { categoryController } from "./category.controller.js";
import {
  categoryIdSchema,
  categoryListSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation.js";

export const categoryAdminRouter = createModuleRouter();
export const categoryShopkeeperRouter = createModuleRouter();

categoryAdminRouter.get("/", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), validate(categoryListSchema), asyncHandler(categoryController.list));
categoryAdminRouter.get("/tree", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), asyncHandler(categoryController.tree));
categoryAdminRouter.get("/:id", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), validate(categoryIdSchema), asyncHandler(categoryController.getById));
categoryAdminRouter.post("/", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), validate(createCategorySchema), asyncHandler(categoryController.create));
categoryAdminRouter.patch("/:id", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), validate(updateCategorySchema), asyncHandler(categoryController.update));
categoryAdminRouter.delete("/:id", ...protectAdmin(PERMISSIONS.CATALOG_MANAGE), validate(categoryIdSchema), asyncHandler(categoryController.remove));

categoryShopkeeperRouter.use(authenticate, requireActorType(ACTOR_TYPES.SHOPKEEPER), requireApprovedShopkeeper);
categoryShopkeeperRouter.get("/tree", asyncHandler(categoryController.shopkeeperTree));
categoryShopkeeperRouter.get("/", asyncHandler(categoryController.shopkeeperList));
