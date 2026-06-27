import { PERMISSIONS } from "../../constants/permissions.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { reportController } from "./report.controller.js";

export const reportAdminRouter = createModuleRouter();

reportAdminRouter.use(...protectAdmin(PERMISSIONS.REPORT_VIEW));

reportAdminRouter.get(
  "/dashboard",
  asyncHandler(reportController.dashboard),
);

reportAdminRouter.get(
  "/sales",
  asyncHandler(reportController.sales),
);

reportAdminRouter.get(
  "/inventory",
  asyncHandler(reportController.inventory),
);

reportAdminRouter.get(
  "/shopkeepers",
  asyncHandler(reportController.shopkeepers),
);

reportAdminRouter.get(
  "/products",
  asyncHandler(reportController.products),
);

reportAdminRouter.get(
  "/payments",
  asyncHandler(reportController.payments),
);

reportAdminRouter.get(
  "/orders",
  asyncHandler(reportController.orders),
);
