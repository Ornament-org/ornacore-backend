import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { khatabookController } from "./khatabook.controller.js";
import {
  addCashCollectionSchema,
  addMetalCollectionSchema,
  createAccountCashCollectionSchema,
  createAccountMetalCollectionSchema,
  createOrderSchema,
  orderLedgerSchema,
  orderParamSchema,
  ordersQuerySchema,
  metalsSummarySchema,
  shopkeeperParamSchema,
} from "./khatabook.validator.js";

export const khatabookAdminRouter = createModuleRouter();

khatabookAdminRouter.get(
  "/metals-summary",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(metalsSummarySchema),
  asyncHandler(khatabookController.getMetalsSummary),
);

khatabookAdminRouter.get(
  "/orders",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(ordersQuerySchema),
  asyncHandler(khatabookController.listOrders),
);

khatabookAdminRouter.post(
  "/orders",
  ...protectAdmin(PERMISSIONS.KHATABOOK_CREATE_ORDER),
  validate(createOrderSchema),
  asyncHandler(khatabookController.createOrder),
);

khatabookAdminRouter.post(
  "/orders/preview",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(createOrderSchema),
  asyncHandler(khatabookController.previewOrder),
);

khatabookAdminRouter.get(
  "/orders/:orderId",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(orderParamSchema),
  asyncHandler(khatabookController.getOrder),
);

khatabookAdminRouter.post(
  "/orders/:orderId/gold-collection",
  ...protectAdmin(PERMISSIONS.KHATABOOK_ADD_PAYMENT),
  validate(addMetalCollectionSchema),
  asyncHandler(khatabookController.addMetalCollection),
);

khatabookAdminRouter.post(
  "/orders/:orderId/cash-collection",
  ...protectAdmin(PERMISSIONS.KHATABOOK_ADD_PAYMENT),
  validate(addCashCollectionSchema),
  asyncHandler(khatabookController.addCashCollection),
);

khatabookAdminRouter.post(
  "/collections/metal",
  ...protectAdmin(PERMISSIONS.KHATABOOK_ADD_PAYMENT),
  validate(createAccountMetalCollectionSchema),
  asyncHandler(khatabookController.createMetalCollection),
);

khatabookAdminRouter.post(
  "/collections/cash",
  ...protectAdmin(PERMISSIONS.KHATABOOK_ADD_PAYMENT),
  validate(createAccountCashCollectionSchema),
  asyncHandler(khatabookController.createCashCollection),
);

khatabookAdminRouter.get(
  "/shopkeeper/:shopkeeperId",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(shopkeeperParamSchema),
  asyncHandler(khatabookController.getShopkeeperKhatabook),
);

khatabookAdminRouter.get(
  "/shopkeeper/:shopkeeperId/metals",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(shopkeeperParamSchema),
  asyncHandler(khatabookController.getShopkeeperMetals),
);

khatabookAdminRouter.get(
  "/shopkeeper/:shopkeeperId/orders",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(ordersQuerySchema),
  asyncHandler(khatabookController.listOrders),
);

khatabookAdminRouter.get(
  "/order/:orderId",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(orderParamSchema),
  asyncHandler(khatabookController.getOrder),
);

khatabookAdminRouter.get(
  "/order/:orderId/ledger",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(orderLedgerSchema),
  asyncHandler(khatabookController.getOrderLedger),
);

khatabookAdminRouter.post(
  "/order",
  ...protectAdmin(PERMISSIONS.KHATABOOK_CREATE_ORDER),
  validate(createOrderSchema),
  asyncHandler(khatabookController.createOrder),
);

khatabookAdminRouter.post(
  "/order/:orderId/add-gold-collection",
  ...protectAdmin(PERMISSIONS.KHATABOOK_ADD_PAYMENT),
  validate(addMetalCollectionSchema),
  asyncHandler(khatabookController.addMetalCollection),
);

khatabookAdminRouter.post(
  "/order/:orderId/add-cash-collection",
  ...protectAdmin(PERMISSIONS.KHATABOOK_ADD_PAYMENT),
  validate(addCashCollectionSchema),
  asyncHandler(khatabookController.addCashCollection),
);
