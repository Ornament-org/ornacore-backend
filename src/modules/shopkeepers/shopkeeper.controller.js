import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { shopkeeperDetailsService } from "./shopkeeper.service.js";

export const shopkeeperDetailsController = {
  // Get shopkeeper profile details
  async details(request, response) {
    response.json(
      ApiResponse.success({
        data: await shopkeeperDetailsService.getDetails(request.validated.params.id),
      }),
    );
  },

  // Get shopkeeper analytics data
  async analytics(request, response) {
    response.json(
      ApiResponse.success({
        data: await shopkeeperDetailsService.getAnalytics(request.validated.params.id),
      }),
    );
  },

  // Get shopkeeper orders summary
  async ordersSummary(request, response) {
    response.json(
      ApiResponse.success({
        data: await shopkeeperDetailsService.getOrdersSummary(request.validated.params.id),
      }),
    );
  },

  // Get shopkeeper ledger summary
  async ledgerSummary(request, response) {
    response.json(
      ApiResponse.success({
        data: await shopkeeperDetailsService.getLedgerSummary(request.validated.params.id),
      }),
    );
  },

  // Get shopkeeper recent activity
  async recentActivity(request, response) {
    response.json(
      ApiResponse.success({
        data: await shopkeeperDetailsService.getRecentActivity(request.validated.params.id),
      }),
    );
  },
};
