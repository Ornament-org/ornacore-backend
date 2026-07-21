import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { homepageController } from "./homepage.controller.js";
import {
  createHomepageSchema,
  createSectionSchema,
  homepageIdSchema,
  listHomepagesSchema,
  reorderSectionsSchema,
  resolveHomepageSchema,
  sectionIdSchema,
  updateHomepageSchema,
  updateSectionSchema,
} from "./homepage.validation.js";

export const homepageAdminRouter = createModuleRouter();
export const homepagePublicRouter = createModuleRouter();
export const homepageShopkeeperRouter = createModuleRouter();

homepageAdminRouter.use(...protectAdmin(PERMISSIONS.CONTENT_MANAGE));

homepageAdminRouter.get("/", validate(listHomepagesSchema), asyncHandler(homepageController.list));
homepageAdminRouter.post("/", validate(createHomepageSchema), asyncHandler(homepageController.create));
homepageAdminRouter.get("/:id", validate(homepageIdSchema), asyncHandler(homepageController.getOne));
homepageAdminRouter.patch(
  "/:id",
  validate(updateHomepageSchema),
  asyncHandler(homepageController.update),
);
homepageAdminRouter.post(
  "/:id/sections",
  validate(createSectionSchema),
  asyncHandler(homepageController.addSection),
);
homepageAdminRouter.put(
  "/:id/sections/reorder",
  validate(reorderSectionsSchema),
  asyncHandler(homepageController.reorderSections),
);
homepageAdminRouter.patch(
  "/:id/sections/:sectionId",
  validate(updateSectionSchema),
  asyncHandler(homepageController.updateSection),
);
homepageAdminRouter.delete(
  "/:id/sections/:sectionId",
  validate(sectionIdSchema),
  asyncHandler(homepageController.deleteSection),
);
homepageAdminRouter.post(
  "/:id/sections/:sectionId/duplicate",
  validate(sectionIdSchema),
  asyncHandler(homepageController.duplicateSection),
);

homepagePublicRouter.get(
  "/",
  validate(resolveHomepageSchema),
  asyncHandler(homepageController.resolve),
);

homepageShopkeeperRouter.get(
  "/",
  validate(resolveHomepageSchema),
  asyncHandler(homepageController.resolveForShopkeeper),
);
