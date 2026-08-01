import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { khatabookController } from "./khatabook.controller.js";
import {
  addCashCollectionSchema,
  addMetalCollectionSchema,
  createAccountCashDueSchema,
  createAccountCashCollectionSchema,
  createAccountMetalDueSchema,
  createAccountMetalCollectionSchema,
  createOrderSchema,
  currentShopkeeperLedgerSchema,
  ledgerQuerySchema,
  orderLedgerSchema,
  orderParamSchema,
  ordersQuerySchema,
  metalsSummarySchema,
  shopkeeperLedgerSchema,
  shopkeeperParamSchema,
} from "./khatabook.validator.js";

export const khatabookAdminRouter = createModuleRouter();
export const khatabookShopkeeperRouter = createModuleRouter();

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

khatabookAdminRouter.post(
  "/dues/metal",
  ...protectAdmin(PERMISSIONS.KHATABOOK_CREATE_ORDER),
  validate(createAccountMetalDueSchema),
  asyncHandler(khatabookController.createMetalDue),
);

khatabookAdminRouter.post(
  "/dues/cash",
  ...protectAdmin(PERMISSIONS.KHATABOOK_CREATE_ORDER),
  validate(createAccountCashDueSchema),
  asyncHandler(khatabookController.createCashDue),
);

khatabookAdminRouter.get(
  "/ledger",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(ledgerQuerySchema),
  asyncHandler(khatabookController.getShopkeeperLedger),
);

khatabookAdminRouter.get(
  "/shopkeeper/:shopkeeperId/ledger",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(shopkeeperLedgerSchema),
  asyncHandler(khatabookController.getShopkeeperLedger),
);

khatabookAdminRouter.get(
  "/shopkeeper/:shopkeeperId/metals",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(shopkeeperParamSchema),
  asyncHandler(khatabookController.getShopkeeperMetals),
);

// BUG-1: Payment position preview — returns metal account summary for the payment page
khatabookAdminRouter.get(
  "/shopkeeper/:shopkeeperId/payment-preview",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(shopkeeperParamSchema),
  asyncHandler(khatabookController.getPaymentPreview),
);

khatabookAdminRouter.get(
  "/shopkeeper/:shopkeeperId/orders",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(ordersQuerySchema),
  asyncHandler(khatabookController.listOrders),
);

khatabookAdminRouter.get(
  "/shopkeeper/:shopkeeperId",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(shopkeeperParamSchema),
  asyncHandler(khatabookController.getShopkeeperKhatabook),
);

khatabookAdminRouter.get(
  "/order/:orderId",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(orderParamSchema),
  asyncHandler(khatabookController.getOrder),
);

// BUG-14: Add plural-form ledger route to match REST convention used elsewhere
khatabookAdminRouter.get(
  "/orders/:orderId/ledger",
  ...protectAdmin(PERMISSIONS.LEDGER_VIEW),
  validate(orderLedgerSchema),
  asyncHandler(khatabookController.getOrderLedger),
);

// Legacy singular form kept for backwards compat
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

khatabookShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);

// Read-only — a shop can see its own khatabook ledger (what staff has
// recorded for deliveries and cash/metal collections against their
// account) but has no write access to any of it.
khatabookShopkeeperRouter.get(
  "/ledger",
  validate(currentShopkeeperLedgerSchema),
  asyncHandler(khatabookController.getCurrentShopkeeperLedger),
);
