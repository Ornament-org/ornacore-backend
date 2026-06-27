import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { authService } from "./auth.service.js";

const getClient = (request) => ({
  ipAddress: request.ip,
  userAgent: request.get("user-agent")?.slice(0, 500),
});

const sendAuthResponse = (response, result, message, statusCode = 200) => {
  const { accessToken, refreshToken, tokenType } = result.session;
  response.setHeader("cache-control", "no-store");
  return response.status(statusCode).json(
    ApiResponse.success({
      message,
      data: {
        user: result.user,
        accessToken,
        refreshToken,
        tokenType,
      },
    }),
  );
};

/*
  POST /auth/admin/login
  { "email": "admin@example.com", "password": "Secret123" }
*/
const adminLogin = async (request, response) => {
  try {
    const result = await authService.adminLogin({
      ...request.validated.body,
      client: getClient(request),
    });
    return sendAuthResponse(response, result, "Admin login successful");
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
  POST /auth/shopkeeper/login
  { "identifier": "shopkeeper@example.com", "password": "Secret123" }
*/
const shopkeeperLogin = async (request, response) => {
  try {
    const result = await authService.shopkeeperLogin({
      ...request.validated.body,
      client: getClient(request),
    });
    return sendAuthResponse(response, result, "Shopkeeper login successful");
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
  POST /auth/shopkeeper/register
  {
    "ownerName": "Ramesh Shah",
    "shopName": "Shah Jewellers",
    "email": "ramesh@example.com",
    "mobile": "+919876543210",
    "password": "Secret123",
    "addressLine1": "12 MG Road",
    "city": "Surat",
    "state": "Gujarat",
    "pincode": "395001",
    "gstNumber": "24AAACH7409R1Z4",
    "businessType": "Retail"
  }
*/
const registerShopkeeper = async (request, response) => {
  try {
    const result = await authService.registerShopkeeper(request.validated.body, getClient(request));
    return sendAuthResponse(response, result, "Registration submitted for admin approval", 201);
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
  POST /auth/admin/refresh
  { "refreshToken": "<refresh_token>" }
*/
const refreshAdminSession = async (request, response) => {
  try {
    const result = await authService.refresh({
      refreshToken: request.validated.body.refreshToken,
      actorScope: "admin",
      client: getClient(request),
    });
    return sendAuthResponse(response, result, "Session refreshed");
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
  POST /auth/shopkeeper/refresh
  { "refreshToken": "<refresh_token>" }
*/
const refreshShopkeeperSession = async (request, response) => {
  try {
    const result = await authService.refresh({
      refreshToken: request.validated.body.refreshToken,
      actorScope: "shopkeeper",
      client: getClient(request),
    });
    return sendAuthResponse(response, result, "Session refreshed");
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
  POST /auth/logout
  { "refreshToken": "<refresh_token>" }
*/
const logout = async (request, response) => {
  try {
    await authService.logout(request.validated.body.refreshToken);
    return response.json(ApiResponse.success({ message: "Logout successful" }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const logoutAll = async (request, response) => {
  try {
    await authService.logoutAll(request.auth.sub);
    return response.json(
      ApiResponse.success({ message: "All active sessions have been logged out" }),
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

const me = async (request, response) => {
  try {
    const user = await authService.getCurrentUser(request.auth.sub);
    return response.json(
      ApiResponse.success({
        message: "Authenticated user retrieved",
        data: {
          user,
          role: user.roles?.[0] ?? null,
          permissions: user.permissions ?? [],
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
  POST /auth/change-password
  { "currentPassword": "OldPass123", "newPassword": "NewPass456" }
*/
const changePassword = async (request, response) => {
  try {
    await authService.changePassword({
      userId: request.auth.sub,
      ...request.validated.body,
    });
    return response.json(
      ApiResponse.success({
        message: "Password changed successfully. Please sign in again.",
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

export const authController = {
  // Authenticate admin user and return session tokens
  adminLogin,
  // Authenticate shopkeeper user and return session tokens
  shopkeeperLogin,
  // Register new shopkeeper account pending admin approval
  registerShopkeeper,
  // Refresh admin session using refresh token
  refreshAdminSession,
  // Refresh shopkeeper session using refresh token
  refreshShopkeeperSession,
  // Logout current session using refresh token
  logout,
  // Logout all active sessions for the authenticated user
  logoutAll,
  // Get current authenticated user details
  me,
  // Change password for authenticated user
  changePassword,
};
