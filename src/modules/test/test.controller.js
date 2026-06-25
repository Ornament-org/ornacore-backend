import { superAdminService } from "../auth/super-admin.service.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";

export const testController = {
  // Bootstrap or update main super-admin account
  async createSuperAdmin(request, response) {
    const result = await superAdminService.bootstrap(request.validated.body);
    return response.status(result.created ? 201 : 200).json(
      ApiResponse.success({
        message: result.created
          ? "Main super-admin account created successfully"
          : "Main super-admin account updated successfully",
        data: result,
      }),
    );
  },
};
