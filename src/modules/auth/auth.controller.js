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

export const authController = {
  // Authenticate admin user and return session tokens
  async adminLogin(request, response) {
    const result = await authService.adminLogin({
      ...request.validated.body,
      client: getClient(request),
    });
    return sendAuthResponse(response, result, "Admin login successful");
  },

  // Authenticate shopkeeper user and return session tokens
  async shopkeeperLogin(request, response) {
    const result = await authService.shopkeeperLogin({
      ...request.validated.body,
      client: getClient(request),
    });
    return sendAuthResponse(response, result, "Shopkeeper login successful");
  },

  // Register new shopkeeper account pending admin approval
  async registerShopkeeper(request, response) {
    const result = await authService.registerShopkeeper(request.validated.body, getClient(request));
    return sendAuthResponse(response, result, "Registration submitted for admin approval", 201);
  },

  // Refresh admin session using refresh token
  async refreshAdminSession(request, response) {
    const result = await authService.refresh({
      refreshToken: request.validated.body.refreshToken,
      actorScope: "admin",
      client: getClient(request),
    });
    return sendAuthResponse(response, result, "Session refreshed");
  },

  // Refresh shopkeeper session using refresh token
  async refreshShopkeeperSession(request, response) {
    const result = await authService.refresh({
      refreshToken: request.validated.body.refreshToken,
      actorScope: "shopkeeper",
      client: getClient(request),
    });
    return sendAuthResponse(response, result, "Session refreshed");
  },

  // Logout current session using refresh token
  async logout(request, response) {
    await authService.logout(request.validated.body.refreshToken);
    return response.json(ApiResponse.success({ message: "Logout successful" }));
  },

  // Logout all active sessions for the authenticated user
  async logoutAll(request, response) {
    await authService.logoutAll(request.auth.sub);
    return response.json(
      ApiResponse.success({ message: "All active sessions have been logged out" }),
    );
  },

  // Get current authenticated user details
  async me(request, response) {
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
  },


  // Change password for authenticated user
  async changePassword(request, response) {
    await authService.changePassword({
      userId: request.auth.sub,
      ...request.validated.body,
    });
    return response.json(
      ApiResponse.success({
        message: "Password changed successfully. Please sign in again.",
      }),
    );
  },
};
