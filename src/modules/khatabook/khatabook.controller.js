import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { khatabookService } from "./khatabook.service.js";

export const khatabookController = {
  // Get khatabook overview for shopkeeper
  async getShopkeeperKhatabook(request, response) {
    response.json(
      ApiResponse.success({
        data: await khatabookService.getShopkeeperKhatabook(request.validated.params.shopkeeperId),
      }),
    );
  },

  // Get metals list for shopkeeper
  async getShopkeeperMetals(request, response) {
    response.json(
      ApiResponse.success({
        data: await khatabookService.getShopkeeperMetals(request.validated.params.shopkeeperId),
      }),
    );
  },

  // List khatabook orders with pagination and filtering
  async listOrders(request, response) {
    try {
      const shopkeeperId = request.validated.params.shopkeeperId ?? request.validated.query.shopkeeperId;
      const result = await khatabookService.listOrders({
        shopkeeperId,
        metalId: request.validated.query.metalId,
        search: request.validated.query.search,
        page: request.validated.query.page,
        pageSize: request.validated.query.pageSize,
      });
      response.json(ApiResponse.success(result));
    } catch (error) {
      console.error("Error in listOrders:", error);
      response.status(500).json(
        ApiResponse.error({
          code: "INTERNAL_ERROR",
          message: error.message || "An unexpected error occurred",
          details: process.env.NODE_ENV === "development" ? error.stack : undefined,
        }),
      );
    }
  },

  // Get metals summary for shopkeeper
  async getMetalsSummary(request, response) {
    response.json(
      ApiResponse.success({
        data: await khatabookService.getShopkeeperMetals(request.validated.query.shopkeeperId),
      }),
    );
  },

  // Get order by ID
  async getOrder(request, response) {
    response.json(
      ApiResponse.success({
        data: await khatabookService.getOrder(request.validated.params.orderId),
      }),
    );
  },

  // Get ledger entries for specific order
  async getOrderLedger(request, response) {
    const result = await khatabookService.getOrderLedger({
      orderId: request.validated.params.orderId,
      page: request.validated.query.page,
      pageSize: request.validated.query.pageSize,
    });
    response.json(ApiResponse.success(result));
  },

  // Create new khatabook order
  async createOrder(request, response) {
    response.status(201).json(
      ApiResponse.success({
        message: "Khatabook order created successfully",
        data: await khatabookService.createOrder({
          payload: request.validated.body,
          request,
        }),
      }),
    );
  },

  // Preview order calculations without saving
  async previewOrder(request, response) {
    response.json(
      ApiResponse.success({
        data: await khatabookService.previewOrder(request.validated.body),
      }),
    );
  },

  // Add metal collection to existing order
  async addMetalCollection(request, response) {
    response.json(
      ApiResponse.success({
        message: "Metal collection added successfully",
        data: await khatabookService.addMetalCollection({
          orderId: request.validated.params.orderId,
          payload: request.validated.body,
          request,
        }),
      }),
    );
  },

  // Create standalone metal collection entry
  async createMetalCollection(request, response) {
    response.status(201).json(
      ApiResponse.success({
        message: "Metal collection added successfully",
        data: await khatabookService.createAccountMetalCollection({
          payload: request.validated.body,
          request,
        }),
      }),
    );
  },

  // Add cash collection to existing order
  async addCashCollection(request, response) {
    response.json(
      ApiResponse.success({
        message: "Cash collection added successfully",
        data: await khatabookService.addCashCollection({
          orderId: request.validated.params.orderId,
          payload: request.validated.body,
          request,
        }),
      }),
    );
  },

  // Create standalone cash collection entry
  async createCashCollection(request, response) {
    response.status(201).json(
      ApiResponse.success({
        message: "Cash collection added successfully",
        data: await khatabookService.createAccountCashCollection({
          payload: request.validated.body,
          request,
        }),
      }),
    );
  },
};
