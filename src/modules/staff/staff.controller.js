import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { staffService } from "./staff.service.js";

export const staffController = {
  // List staff users with pagination and filtering
  async list(request, response) {
    const result = await staffService.list(request.validated.query);
    return response.json(
      ApiResponse.success({
        data: result.rows,
        meta: result.meta,
      }),
    );
  },

  // Create new staff account and email credentials
  async create(request, response) {
    const result = await staffService.create({
      payload: request.validated.body,
      request,
    });
    return response.status(201).json(
      ApiResponse.success({
        message:
          result.emailDelivery.status === "SENT"
            ? "Staff account created and login credentials emailed successfully"
            : "Staff account created, but the credentials email could not be delivered",
        data: {
          user: result.user,
          staffProfile: result.profile,
          role: result.role,
          emailDelivery: result.emailDelivery,
        },
      }),
    );
  },

  // Update staff account by ID
  async update(request, response) {
    const user = await staffService.update({
      userId: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({
        message: "Staff account updated successfully",
        data: user,
      }),
    );
  },

  // Reset staff password and email new credentials
  async resetPassword(request, response) {
    const emailDelivery = await staffService.regenerateCredentials({
      userId: request.validated.params.id,
      request,
    });
    return response.json(
      ApiResponse.success({
        message:
          emailDelivery.status === "SENT"
            ? "New temporary password generated and emailed successfully"
            : "New temporary password generated, but the email could not be delivered",
        data: { emailDelivery },
      }),
    );
  },

  // Soft delete staff user by ID
  async remove(request, response) {
    await staffService.remove({
      userId: request.validated.params.id,
      actorUserId: request.auth.sub,
    });
    return response.json(ApiResponse.success({ message: "Staff user deleted successfully" }));
  },

  // Restore soft deleted staff user
  async restore(request, response) {
    await staffService.restore(request.validated.params.id);
    return response.json(ApiResponse.success({ message: "Staff user restored successfully" }));
  },
};
