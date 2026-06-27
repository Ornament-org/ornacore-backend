import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { khatabookService } from "./khatabook.service.js";

const getShopkeeperKhatabook = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await khatabookService.getShopkeeperKhatabook(request.validated.params.shopkeeperId),
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

const getShopkeeperMetals = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await khatabookService.getShopkeeperMetals(request.validated.params.shopkeeperId),
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

const listOrders = async (request, response) => {
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
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const getMetalsSummary = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await khatabookService.getShopkeeperMetals(request.validated.query.shopkeeperId),
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

const getOrder = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await khatabookService.getOrder(request.validated.params.orderId),
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

const getOrderLedger = async (request, response) => {
  try {
    const result = await khatabookService.getOrderLedger({
      orderId: request.validated.params.orderId,
      page: request.validated.query.page,
      pageSize: request.validated.query.pageSize,
    });
    response.json(ApiResponse.success(result));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const createOrder = async (request, response) => {
  try {
    response.status(201).json(
      ApiResponse.success({
        message: "Khatabook order created successfully",
        data: await khatabookService.createOrder({
          payload: request.validated.body,
          request,
        }),
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

const previewOrder = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await khatabookService.previewOrder(request.validated.body),
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

const addMetalCollection = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const createMetalCollection = async (request, response) => {
  try {
    response.status(201).json(
      ApiResponse.success({
        message: "Metal collection added successfully",
        data: await khatabookService.createAccountMetalCollection({
          payload: request.validated.body,
          request,
        }),
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

const addCashCollection = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const createCashCollection = async (request, response) => {
  try {
    response.status(201).json(
      ApiResponse.success({
        message: "Cash collection added successfully",
        data: await khatabookService.createAccountCashCollection({
          payload: request.validated.body,
          request,
        }),
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

// BUG-1: New controller — returns position data for a specific shopkeeper+metal
// Used by the admin "Add Received Payment" page to show current outstanding/credit.
const getPaymentPreview = async (request, response) => {
  try {
    const { shopkeeperId } = request.validated.params;
    const { metalId } = request.validated.query;
    const metals = await khatabookService.getShopkeeperMetals(shopkeeperId);
    const position = metalId
      ? (metals.find((r) => String(r.metal.id) === String(metalId)) ?? null)
      : null;
    response.json(ApiResponse.success({ data: position }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const khatabookController = {
  // Get khatabook overview for shopkeeper
  getShopkeeperKhatabook,
  // Get metals list for shopkeeper
  getShopkeeperMetals,
  // List khatabook orders with pagination and filtering
  listOrders,
  // Get metals summary for shopkeeper
  getMetalsSummary,
  // Get order by ID
  getOrder,
  // Get ledger entries for specific order
  getOrderLedger,
  // Create new khatabook order
  createOrder,
  // Preview order calculations without saving
  previewOrder,
  // Add metal collection to existing order
  addMetalCollection,
  // Create standalone metal collection entry
  createMetalCollection,
  // Add cash collection to existing order
  addCashCollection,
  // Create standalone cash collection entry
  createCashCollection,
  // Payment position preview for a shopkeeper+metal (BUG-1)
  getPaymentPreview,
};
