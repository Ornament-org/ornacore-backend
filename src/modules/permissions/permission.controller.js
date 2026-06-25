import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { permissionService } from "./permission.service.js";

export const permissionController = {
  // List all available permissions
  async list(_request, response) {
    return response.json(ApiResponse.success({ data: await permissionService.list() }));
  },
};
