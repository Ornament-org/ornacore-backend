import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { notificationService } from "./notification.service.js";

export const notificationController = {
  // List notifications for authenticated user
  async listForCurrentUser(request, response) {
    return response.json(
      ApiResponse.success({ data: await notificationService.listForUser(request.auth.sub) }),
    );
  },
};
