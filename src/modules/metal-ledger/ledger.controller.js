import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { metalLedgerService } from "./ledger.service.js";

const createLedgerTransaction = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const getLedgerTransactionById = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await metalLedgerService.getTransactionById(request.validated.params.id),
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

const updateLedgerTransaction = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const voidLedgerTransaction = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const getLedgerSummary = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await metalLedgerService.getShopLedgerSummary({
          shopkeeperId: request.validated.params.shopId,
          metalId: request.validated.query.metalId,
        }),
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

const getLedgerTimeline = async (request, response) => {
  try {
    const result = await metalLedgerService.getRunningBalanceTimeline({
      shopkeeperId: request.validated.params.shopId,
      metalId: request.validated.query.metalId,
      from: request.validated.query.from,
      to: request.validated.query.to,
      page: request.validated.query.page,
      pageSize: request.validated.query.pageSize,
    });
    response.json(ApiResponse.success(result));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const getCurrentShopLedgerSummary = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await metalLedgerService.getShopLedgerSummary({
          shopkeeperId: request.shopkeeper.id,
          metalId: request.validated.query.metalId,
        }),
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

const getCurrentShopLedgerTimeline = async (request, response) => {
  try {
    const result = await metalLedgerService.getRunningBalanceTimeline({
      shopkeeperId: request.shopkeeper.id,
      metalId: request.validated.query.metalId,
      from: request.validated.query.from,
      to: request.validated.query.to,
      page: request.validated.query.page,
      pageSize: request.validated.query.pageSize,
    });
    response.json(ApiResponse.success(result));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const metalLedgerController = {
  // Create new metal ledger transaction
  createLedgerTransaction,
  // Get ledger transaction by ID
  getLedgerTransactionById,
  // Update ledger transaction by ID
  updateLedgerTransaction,
  // Void ledger transaction with reason
  voidLedgerTransaction,
  // Get ledger summary for shopkeeper and metal
  getLedgerSummary,
  // Get running balance timeline for shopkeeper and metal
  getLedgerTimeline,
  // Get ledger summary for authenticated shopkeeper
  getCurrentShopLedgerSummary,
  // Get ledger timeline for authenticated shopkeeper
  getCurrentShopLedgerTimeline,
};
