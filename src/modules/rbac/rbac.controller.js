import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { rbacService } from "./rbac.service.js";

const roles = async (_request, response) => {
  try {
    return response.json(
      ApiResponse.success({
        data: await rbacService.listRoles(),
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

const permissionsMatrix = async (_request, response) => {
  try {
    return response.json(
      ApiResponse.success({
        data: await rbacService.getPermissionMatrix(),
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
  PUT /admin/rbac/role-permissions
  { "roleId": 2, "permissionId": 5, "allowed": true }
*/
const updateRolePermission = async (request, response) => {
  try {
    return response.json(
      ApiResponse.success({
        message: "Permission updated successfully",
        data: await rbacService.updateRolePermission(request.validated.body),
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

export const rbacController = {
  roles,
  permissionsMatrix,
  updateRolePermission,
};
