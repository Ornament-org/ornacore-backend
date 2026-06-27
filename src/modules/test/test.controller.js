import { superAdminService } from "../auth/super-admin.service.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";

const createSuperAdmin = async (request, response) => {
  try {
    const result = await superAdminService.bootstrap(request.validated.body);
    return response.status(result.created ? 201 : 200).json(
      ApiResponse.success({
        message: result.created
          ? "Main super-admin account created successfully"
          : "Main super-admin account updated successfully",
        data: result,
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

export const testController = {
  // Bootstrap or update main super-admin account
  createSuperAdmin,
};
