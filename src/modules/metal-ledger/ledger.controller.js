import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { metalLedgerService } from "./ledger.service.js";

export const metalLedgerController = {
  // Create new metal ledger transaction
  async createLedgerTransaction(request, response) {
    const data = await metalLedgerService.createTransaction({
      ...request.validated.body,
      actorUserId: request.auth.sub,
    });
    response.status(201).json(
      ApiResponse.success({
        message: "Ledger transaction created successfully",
        data,
      }),
    );
  },

  // Get ledger transaction by ID
  async getLedgerTransactionById(request, response) {
    response.json(
      ApiResponse.success({
        data: await metalLedgerService.getTransactionById(request.validated.params.id),
      }),
    );
  },

  // Update ledger transaction by ID
  async updateLedgerTransaction(request, response) {
    response.json(
      ApiResponse.success({
        message: "Ledger transaction updated successfully",
        data: await metalLedgerService.updateTransaction({
          id: request.validated.params.id,
          payload: request.validated.body,
          actorUserId: request.auth.sub,
        }),
      }),
    );
  },

  // Void ledger transaction with reason
  async voidLedgerTransaction(request, response) {
    response.json(
      ApiResponse.success({
        message: "Ledger transaction voided successfully",
        data: await metalLedgerService.voidTransaction({
          id: request.validated.params.id,
          reason: request.validated.body.reason,
          actorUserId: request.auth.sub,
        }),
      }),
    );
  },

  // Get ledger summary for shopkeeper and metal
  async getLedgerSummary(request, response) {
    response.json(
      ApiResponse.success({
        data: await metalLedgerService.getShopLedgerSummary({
          shopkeeperId: request.validated.params.shopId,
          metalId: request.validated.query.metalId,
        }),
      }),
    );
  },

  // Get running balance timeline for shopkeeper and metal
  async getLedgerTimeline(request, response) {
    const result = await metalLedgerService.getRunningBalanceTimeline({
      shopkeeperId: request.validated.params.shopId,
      metalId: request.validated.query.metalId,
      from: request.validated.query.from,
      to: request.validated.query.to,
      page: request.validated.query.page,
      pageSize: request.validated.query.pageSize,
    });
    response.json(ApiResponse.success(result));
  },

  // Get ledger summary for authenticated shopkeeper
  async getCurrentShopLedgerSummary(request, response) {
    response.json(
      ApiResponse.success({
        data: await metalLedgerService.getShopLedgerSummary({
          shopkeeperId: request.shopkeeper.id,
          metalId: request.validated.query.metalId,
        }),
      }),
    );
  },

  // Get ledger timeline for authenticated shopkeeper
  async getCurrentShopLedgerTimeline(request, response) {
    const result = await metalLedgerService.getRunningBalanceTimeline({
      shopkeeperId: request.shopkeeper.id,
      metalId: request.validated.query.metalId,
      from: request.validated.query.from,
      to: request.validated.query.to,
      page: request.validated.query.page,
      pageSize: request.validated.query.pageSize,
    });
    response.json(ApiResponse.success(result));
  },
};
