import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { deliveryService } from "./delivery.service.js";

export const deliveryController = {
  // List deliveries with pagination and filtering
  async list(request, response) {
    const result = await deliveryService.list(request.validated.query);
    return response.json(
      ApiResponse.success({
        message: "delivery fetched successfully",
        data: result.rows,
        meta: result.meta,
      }),
    );
  },

  // List deliveries for authenticated shopkeeper
  async listForShopkeeper(request, response) {
    return response.json(
      ApiResponse.success({ data: await deliveryService.listForShopkeeper(request.shopkeeper.id) }),
    );
  },

  // Get delivery by ID
  async getById(request, response) {
    return response.json(
      ApiResponse.success({ data: await deliveryService.getById(request.validated.params.id) }),
    );
  },

  // Create new delivery
  async create(request, response) {
    const delivery = await deliveryService.create({
      payload: request.validated.body,
      request,
    });
    return response
      .status(201)
      .json(ApiResponse.success({ message: "Delivery created successfully", data: delivery }));
  },

  // Update delivery by ID
  async update(request, response) {
    const delivery = await deliveryService.update({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({ message: "Delivery updated successfully", data: delivery }),
    );
  },
};
