import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { rbacService } from "./rbac.service.js";

export const rbacController = {
  async roles(_request, response) {
    return response.json(
      ApiResponse.success({
        data: await rbacService.listRoles(),
      }),
    );
  },

  async permissionsMatrix(_request, response) {
    return response.json(
      ApiResponse.success({
        data: await rbacService.getPermissionMatrix(),
      }),
    );
  },

  async updateRolePermission(request, response) {
    return response.json(
      ApiResponse.success({
        message: "Permission updated successfully",
        data: await rbacService.updateRolePermission(request.validated.body),
      }),
    );
  },
};
