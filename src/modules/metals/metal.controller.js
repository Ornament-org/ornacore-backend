import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { metalService } from "./metal.service.js";

export const metalController = {
  // List metals with pagination and filtering
  async list(request, response) {
    const result = await metalService.list(request.validated.query);
    return response.json(
      ApiResponse.success({
        message: "metals fetched successfully",
        data: result.rows,
        meta: result.meta,
      }),
    );
  },

  // List all active metals
  async listActive(_request, response) {
    return response.json(
      ApiResponse.success({
        message: "Metals fetched successfully",
        data: await metalService.listActive(),
      }),
    );
  },

  // Get metal by ID
  async getById(request, response) {
    return response.json(
      ApiResponse.success({ data: await metalService.getById(request.validated.params.id) }),
    );
  },

  // Create new metal
  async create(request, response) {
    const metal = await metalService.create({
      payload: request.validated.body,
      request,
    });
    return response
      .status(201)
      .json(ApiResponse.success({ message: "Metal created successfully", data: metal }));
  },

  // Update metal by ID
  async update(request, response) {
    const metal = await metalService.update({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({ message: "Metal updated successfully", data: metal }),
    );
  },

  // Delete metal by ID
  async remove(request, response) {
    await metalService.remove({ id: request.validated.params.id, request });
    return response.json(ApiResponse.success({ message: "Metal deleted successfully" }));
  },
};
