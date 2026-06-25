import { authenticate } from "../../middlewares/authenticate.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { notificationController } from "./notification.controller.js";

export const notificationShopkeeperRouter = createModuleRouter();

notificationShopkeeperRouter.use(authenticate);
notificationShopkeeperRouter.get("/", asyncHandler(notificationController.listForCurrentUser));
