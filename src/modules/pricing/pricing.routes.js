import { PERMISSIONS } from "../../constants/permissions.js";
import { validate } from "../../middlewares/validate.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { createModuleRouter } from "../module.router.js";
import { pricingController } from "./pricing.controller.js";
import {
  createPriceGroupSchema,
  createPricingRuleSchema,
  createShopkeeperPriceOverrideSchema,
  updatePriceGroupSchema,
  updatePricingRuleSchema,
  updateShopkeeperPriceOverrideSchema,
} from "./pricing.validation.js";

export const pricingAdminRouter = createModuleRouter();

const priceGroupRouter = createModuleRouter();
const pricingRuleRouter = createModuleRouter();
const shopkeeperPriceOverrideRouter = createModuleRouter();

const allowPricingView = protectAdmin(PERMISSIONS.PRICING_VIEW);
const allowPricingUpdate = protectAdmin(PERMISSIONS.PRICING_UPDATE);

priceGroupRouter.use(...allowPricingView);
priceGroupRouter.get("/", validate(listQuerySchema), asyncHandler(pricingController.listPriceGroups));
priceGroupRouter.get(
  "/:id",
  validate(idParamSchema),
  asyncHandler(pricingController.getPriceGroupById),
);
priceGroupRouter.post(
  "/",
  ...allowPricingUpdate,
  validate(createPriceGroupSchema),
  asyncHandler(pricingController.createPriceGroup),
);
priceGroupRouter.patch(
  "/:id",
  ...allowPricingUpdate,
  validate(updatePriceGroupSchema),
  asyncHandler(pricingController.updatePriceGroup),
);
priceGroupRouter.delete(
  "/:id",
  ...allowPricingUpdate,
  validate(idParamSchema),
  asyncHandler(pricingController.removePriceGroup),
);

pricingRuleRouter.use(...allowPricingView);
pricingRuleRouter.get(
  "/",
  validate(listQuerySchema),
  asyncHandler(pricingController.listPricingRules),
);
pricingRuleRouter.get(
  "/:id",
  validate(idParamSchema),
  asyncHandler(pricingController.getPricingRuleById),
);
pricingRuleRouter.post(
  "/",
  ...allowPricingUpdate,
  validate(createPricingRuleSchema),
  asyncHandler(pricingController.createPricingRule),
);
pricingRuleRouter.patch(
  "/:id",
  ...allowPricingUpdate,
  validate(updatePricingRuleSchema),
  asyncHandler(pricingController.updatePricingRule),
);
pricingRuleRouter.delete(
  "/:id",
  ...allowPricingUpdate,
  validate(idParamSchema),
  asyncHandler(pricingController.removePricingRule),
);

shopkeeperPriceOverrideRouter.use(...allowPricingView);
shopkeeperPriceOverrideRouter.get(
  "/",
  validate(listQuerySchema),
  asyncHandler(pricingController.listShopkeeperPriceOverrides),
);
shopkeeperPriceOverrideRouter.get(
  "/:id",
  validate(idParamSchema),
  asyncHandler(pricingController.getShopkeeperPriceOverrideById),
);
shopkeeperPriceOverrideRouter.post(
  "/",
  ...allowPricingUpdate,
  validate(createShopkeeperPriceOverrideSchema),
  asyncHandler(pricingController.createShopkeeperPriceOverride),
);
shopkeeperPriceOverrideRouter.patch(
  "/:id",
  ...allowPricingUpdate,
  validate(updateShopkeeperPriceOverrideSchema),
  asyncHandler(pricingController.updateShopkeeperPriceOverride),
);
shopkeeperPriceOverrideRouter.delete(
  "/:id",
  ...allowPricingUpdate,
  validate(idParamSchema),
  asyncHandler(pricingController.removeShopkeeperPriceOverride),
);

pricingAdminRouter.use("/rules", pricingRuleRouter);
pricingAdminRouter.use("/overrides", shopkeeperPriceOverrideRouter);
pricingAdminRouter.use("/", priceGroupRouter);
