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

export const pricingController = {
  // List price groups with pagination and filtering
  async listPriceGroups(request, response) {
    return sendList(
      response,
      "pricing fetched successfully",
      await pricingService.listPriceGroups(request.validated.query),
    );
  },

  // Get price group by ID
  async getPriceGroupById(request, response) {
    return response.json(
      ApiResponse.success({
        data: await pricingService.getPriceGroupById(request.validated.params.id),
      }),
    );
  },

  // Create new price group
  async createPriceGroup(request, response) {
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
  },

  // Update price group by ID
  async updatePriceGroup(request, response) {
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
  },

  // Delete price group by ID
  async removePriceGroup(request, response) {
    await pricingService.removePriceGroup({ id: request.validated.params.id, request });
    return response.json(ApiResponse.success({ message: "PriceGroup deleted successfully" }));
  },

  // List pricing rules with pagination and filtering
  async listPricingRules(request, response) {
    return sendList(
      response,
      "pricing fetched successfully",
      await pricingService.listPricingRules(request.validated.query),
    );
  },

  // Get pricing rule by ID
  async getPricingRuleById(request, response) {
    return response.json(
      ApiResponse.success({
        data: await pricingService.getPricingRuleById(request.validated.params.id),
      }),
    );
  },

  // Create new pricing rule
  async createPricingRule(request, response) {
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
  },

  // Update pricing rule by ID
  async updatePricingRule(request, response) {
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
  },

  // Delete pricing rule by ID
  async removePricingRule(request, response) {
    await pricingService.removePricingRule({ id: request.validated.params.id, request });
    return response.json(ApiResponse.success({ message: "PricingRule deleted successfully" }));
  },

  // List shopkeeper price overrides with pagination and filtering
  async listShopkeeperPriceOverrides(request, response) {
    return sendList(
      response,
      "pricing fetched successfully",
      await pricingService.listShopkeeperPriceOverrides(request.validated.query),
    );
  },

  // Get shopkeeper price override by ID
  async getShopkeeperPriceOverrideById(request, response) {
    return response.json(
      ApiResponse.success({
        data: await pricingService.getShopkeeperPriceOverrideById(request.validated.params.id),
      }),
    );
  },

  // Create new shopkeeper price override
  async createShopkeeperPriceOverride(request, response) {
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
  },

  // Update shopkeeper price override by ID
  async updateShopkeeperPriceOverride(request, response) {
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
  },

  // Delete shopkeeper price override by ID
  async removeShopkeeperPriceOverride(request, response) {
    await pricingService.removeShopkeeperPriceOverride({
      id: request.validated.params.id,
      request,
    });
    return response.json(
      ApiResponse.success({ message: "ShopkeeperPriceOverride deleted successfully" }),
    );
  },
};
