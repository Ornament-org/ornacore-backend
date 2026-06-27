import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { pricingService } from "./pricing.service.js";

const sendList = (response, message, result) =>
  response.json(
    ApiResponse.success({
      message,
      data: result.rows,
      meta: result.meta,
    }),
  );

const listPriceGroups = async (request, response) => {
  try {
    return sendList(
      response,
      "pricing fetched successfully",
      await pricingService.listPriceGroups(request.validated.query),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const getPriceGroupById = async (request, response) => {
  try {
    return response.json(
      ApiResponse.success({
        data: await pricingService.getPriceGroupById(request.validated.params.id),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/pricing
  { "code": "WHOLESALE", "name": "Wholesale Group", "description": "Bulk buyer pricing", "isActive": true }
*/
const createPriceGroup = async (request, response) => {
  try {
    const priceGroup = await pricingService.createPriceGroup({
      payload: request.validated.body,
      request,
    });
    return response.status(201).json(
      ApiResponse.success({
        message: "PriceGroup created successfully",
        data: priceGroup,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  PATCH /admin/pricing/:id
  { "name": "Updated Wholesale Group", "isActive": false }
*/
const updatePriceGroup = async (request, response) => {
  try {
    const priceGroup = await pricingService.updatePriceGroup({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({
        message: "PriceGroup updated successfully",
        data: priceGroup,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  DELETE /admin/pricing/:id
  (no body)
*/
const removePriceGroup = async (request, response) => {
  try {
    await pricingService.removePriceGroup({ id: request.validated.params.id, request });
    return response.json(ApiResponse.success({ message: "PriceGroup deleted successfully" }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const listPricingRules = async (request, response) => {
  try {
    return sendList(
      response,
      "pricing fetched successfully",
      await pricingService.listPricingRules(request.validated.query),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const getPricingRuleById = async (request, response) => {
  try {
    return response.json(
      ApiResponse.success({
        data: await pricingService.getPricingRuleById(request.validated.params.id),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/pricing/rules
  {
    "ruleType": "METAL_RATE_BASED",
    "productVariantId": 7,
    "priceGroupId": 2,
    "makingCharge": 250,
    "percentageValue": null,
    "priority": 10,
    "isActive": true,
    "startsAt": "2026-07-01T00:00:00.000Z",
    "endsAt": null
  }
*/
const createPricingRule = async (request, response) => {
  try {
    const pricingRule = await pricingService.createPricingRule({
      payload: request.validated.body,
      request,
    });
    return response.status(201).json(
      ApiResponse.success({
        message: "PricingRule created successfully",
        data: pricingRule,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  PATCH /admin/pricing/rules/:id
  { "makingCharge": 300, "priority": 5, "isActive": true }
*/
const updatePricingRule = async (request, response) => {
  try {
    const pricingRule = await pricingService.updatePricingRule({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({
        message: "PricingRule updated successfully",
        data: pricingRule,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  DELETE /admin/pricing/rules/:id
  (no body)
*/
const removePricingRule = async (request, response) => {
  try {
    await pricingService.removePricingRule({ id: request.validated.params.id, request });
    return response.json(ApiResponse.success({ message: "PricingRule deleted successfully" }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const listShopkeeperPriceOverrides = async (request, response) => {
  try {
    return sendList(
      response,
      "pricing fetched successfully",
      await pricingService.listShopkeeperPriceOverrides(request.validated.query),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const getShopkeeperPriceOverrideById = async (request, response) => {
  try {
    return response.json(
      ApiResponse.success({
        data: await pricingService.getShopkeeperPriceOverrideById(request.validated.params.id),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/pricing/overrides
  { "shopkeeperId": 1, "productVariantId": 7, "overridePrice": 2950, "reason": "Loyal customer discount", "isActive": true }
*/
const createShopkeeperPriceOverride = async (request, response) => {
  try {
    const override = await pricingService.createShopkeeperPriceOverride({
      payload: request.validated.body,
      request,
    });
    return response.status(201).json(
      ApiResponse.success({
        message: "ShopkeeperPriceOverride created successfully",
        data: override,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  PATCH /admin/pricing/overrides/:id
  { "overridePrice": 2800, "reason": "Updated discount", "isActive": true }
*/
const updateShopkeeperPriceOverride = async (request, response) => {
  try {
    const override = await pricingService.updateShopkeeperPriceOverride({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({
        message: "ShopkeeperPriceOverride updated successfully",
        data: override,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  DELETE /admin/pricing/overrides/:id
  (no body)
*/
const removeShopkeeperPriceOverride = async (request, response) => {
  try {
    await pricingService.removeShopkeeperPriceOverride({
      id: request.validated.params.id,
      request,
    });
    return response.json(
      ApiResponse.success({ message: "ShopkeeperPriceOverride deleted successfully" }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const pricingController = {
  // List price groups with pagination and filtering
  listPriceGroups,
  // Get price group by ID
  getPriceGroupById,
  // Create new price group
  createPriceGroup,
  // Update price group by ID
  updatePriceGroup,
  // Delete price group by ID
  removePriceGroup,
  // List pricing rules with pagination and filtering
  listPricingRules,
  // Get pricing rule by ID
  getPricingRuleById,
  // Create new pricing rule
  createPricingRule,
  // Update pricing rule by ID
  updatePricingRule,
  // Delete pricing rule by ID
  removePricingRule,
  // List shopkeeper price overrides with pagination and filtering
  listShopkeeperPriceOverrides,
  // Get shopkeeper price override by ID
  getShopkeeperPriceOverrideById,
  // Create new shopkeeper price override
  createShopkeeperPriceOverride,
  // Update shopkeeper price override by ID
  updateShopkeeperPriceOverride,
  // Delete shopkeeper price override by ID
  removeShopkeeperPriceOverride,
};
