import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { permissionService } from "./permission.service.js";

const list = async (_request, response) => {
  try {
    return response.json(ApiResponse.success({ data: await permissionService.list() }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const permissionController = {
  // List all available permissions
  list,
};
