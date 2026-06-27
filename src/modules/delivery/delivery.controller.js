import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { deliveryService } from "./delivery.service.js";

const list = async (request, response) => {
  try {
    const result = await deliveryService.list(request.validated.query);
    return response.json(
      ApiResponse.success({
        message: "delivery fetched successfully",
        data: result.rows,
        meta: result.meta,
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

const listForShopkeeper = async (request, response) => {
  try {
    return response.json(
      ApiResponse.success({ data: await deliveryService.listForShopkeeper(request.shopkeeper.id) }),
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

const getById = async (request, response) => {
  try {
    return response.json(
      ApiResponse.success({ data: await deliveryService.getById(request.validated.params.id) }),
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
  POST /admin/delivery
  {
    "orderId": 15,
    "status": "DISPATCHED",
    "courierName": "BlueDart",
    "trackingNumber": "BD-12345678",
    "trackingUrl": "https://bluedart.com/track/BD-12345678",
    "dispatchedAt": "2026-06-27T09:00:00.000Z",
    "estimatedDeliveryAt": "2026-06-29T18:00:00.000Z",
    "notes": "Handle with care"
  }
*/
const create = async (request, response) => {
  try {
    const delivery = await deliveryService.create({
      payload: request.validated.body,
      request,
    });
    return response
      .status(201)
      .json(ApiResponse.success({ message: "Delivery created successfully", data: delivery }));
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
  PATCH /admin/delivery/:id
  { "status": "DELIVERED", "deliveredAt": "2026-06-29T14:30:00.000Z", "notes": "Delivered to owner" }
*/
const update = async (request, response) => {
  try {
    const delivery = await deliveryService.update({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({ message: "Delivery updated successfully", data: delivery }),
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

export const deliveryController = {
  // List deliveries with pagination and filtering
  list,
  // List deliveries for authenticated shopkeeper
  listForShopkeeper,
  // Get delivery by ID
  getById,
  // Create new delivery
  create,
  // Update delivery by ID
  update,
};
