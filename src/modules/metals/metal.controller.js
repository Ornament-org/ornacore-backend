import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { metalService } from "./metal.service.js";

const list = async (request, response) => {
  try {
    const result = await metalService.list(request.validated.query);
    return response.json(
      ApiResponse.success({
        message: "metals fetched successfully",
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

const listActive = async (_request, response) => {
  try {
    return response.json(
      ApiResponse.success({
        message: "Metals fetched successfully",
        data: await metalService.listActive(),
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

const getById = async (request, response) => {
  try {
    return response.json(
      ApiResponse.success({ data: await metalService.getById(request.validated.params.id) }),
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

const create = async (request, response) => {
  try {
    const metal = await metalService.create({
      payload: request.validated.body,
      request,
    });
    return response
      .status(201)
      .json(ApiResponse.success({ message: "Metal created successfully", data: metal }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const update = async (request, response) => {
  try {
    const metal = await metalService.update({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({ message: "Metal updated successfully", data: metal }),
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

const remove = async (request, response) => {
  try {
    await metalService.remove({ id: request.validated.params.id, request });
    return response.json(ApiResponse.success({ message: "Metal deleted successfully" }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const metalController = {
  // List metals with pagination and filtering
  list,
  // List all active metals
  listActive,
  // Get metal by ID
  getById,
  // Create new metal
  create,
  // Update metal by ID
  update,
  // Delete metal by ID
  remove,
};
