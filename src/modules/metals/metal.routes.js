import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { metalController } from "./metal.controller.js";
import { createMetalSchema, updateMetalSchema } from "./metal.validation.js";

export const metalAdminRouter = createModuleRouter();

export const metalShopkeeperRouter = createModuleRouter();

metalAdminRouter.use(...protectAdmin(PERMISSIONS.CATALOG_MANAGE));

metalAdminRouter.get("/", validate(listQuerySchema), asyncHandler(metalController.list));
metalAdminRouter.get("/:id", validate(idParamSchema), asyncHandler(metalController.getById));
metalAdminRouter.post("/", validate(createMetalSchema), asyncHandler(metalController.create));
metalAdminRouter.patch("/:id", validate(updateMetalSchema), asyncHandler(metalController.update));
metalAdminRouter.delete("/:id", validate(idParamSchema), asyncHandler(metalController.remove));

metalShopkeeperRouter.get(
  "/",
  asyncHandler(metalController.listActive),
);
