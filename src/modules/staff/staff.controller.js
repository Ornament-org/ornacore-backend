import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { staffService } from "./staff.service.js";

const list = async (request, response) => {
  try {
    const result = await staffService.list(request.validated.query);
    return response.json(
      ApiResponse.success({
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

/*
  POST /admin/staff
  { "fullName": "Ravi Kumar", "email": "ravi@example.com", "mobile": "+919876543210", "designation": "Sales Manager", "actorType": "STAFF", "roleId": 3 }
*/
const create = async (request, response) => {
  try {
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
  PATCH /admin/staff/:id
  { "fullName": "Ravi Kumar", "designation": "Senior Sales Manager", "status": "ACTIVE", "roleId": 3 }
*/
const update = async (request, response) => {
  try {
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
  POST /admin/staff/:id/reset-password
  {}
*/
const resetPassword = async (request, response) => {
  try {
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
    await staffService.remove({
      userId: request.validated.params.id,
      actorUserId: request.auth.sub,
    });
    return response.json(ApiResponse.success({ message: "Staff user deleted successfully" }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const restore = async (request, response) => {
  try {
    await staffService.restore(request.validated.params.id);
    return response.json(ApiResponse.success({ message: "Staff user restored successfully" }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const staffController = {
  // List staff users with pagination and filtering
  list,
  // Create new staff account and email credentials
  create,
  // Update staff account by ID
  update,
  // Reset staff password and email new credentials
  resetPassword,
  // Soft delete staff user by ID
  remove,
  // Restore soft deleted staff user
  restore,
};
