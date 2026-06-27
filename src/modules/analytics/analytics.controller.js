import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { analyticsService } from "./analytics.service.js";

const getShopkeeperOverview = async (request, response) => {
  try {
    const { shopkeeperId } = request.validated.params;
    const { startDate, endDate } = request.validated.query;
    const result = await analyticsService.getShopkeeperOverview(
      Number(shopkeeperId),
      startDate,
      endDate,
    );
    response.json(ApiResponse.success({ data: result }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const analyticsController = { getShopkeeperOverview };
