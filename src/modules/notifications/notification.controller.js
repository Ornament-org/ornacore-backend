import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { notificationService } from "./notification.service.js";

const listForCurrentUser = async (request, response) => {
  try {
    return response.json(
      ApiResponse.success({ data: await notificationService.listForUser(request.auth.sub) }),
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

export const notificationController = {
  // List notifications for authenticated user
  listForCurrentUser,
};
