import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { metalRateService } from "./metal-rate.service.js";

/*
  GET /admin/metal-rates
  GET /shopkeeper/metal-rates
  Returns one row per active metal with today's computed rate (base + extra)
  and the change versus the previous recorded rate date.
*/
const list = async (_request, response, next) => {
  try {
    const data = await metalRateService.getCurrentRates();
    response.json(ApiResponse.success({ data }));
  } catch (error) {
    next(error);
  }
};

/*
  PUT /admin/metal-rates/:metalId
  { "basePricePerGram": 9796, "extraPerGram": 24 }
  Upserts today's rate for the metal — safe to call multiple times per day.
*/
const upsert = async (request, response, next) => {
  try {
    const { metalId } = request.validated.params;
    const { basePricePerGram, extraPerGram } = request.validated.body;
    await metalRateService.upsertToday({
      metalId,
      basePricePerGram,
      extraPerGram,
      request,
    });
    const data = await metalRateService.getCurrentRateForMetal(metalId);
    response.json(ApiResponse.success({ message: "Metal rate updated successfully", data }));
  } catch (error) {
    next(error);
  }
};

/*
  POST /admin/metal-rates/sync/bullions
  Fetches Bihar bullion rates from Bullions and upserts today's Gold/Silver rows.
*/
const syncBullions = async (request, response, next) => {
  try {
    const data = await metalRateService.syncFromBullionsBihar({ request });
    response.json(ApiResponse.success({ message: "Bullions metal rates synced", data }));
  } catch (error) {
    next(error);
  }
};

export const metalRateController = {
  list,
  upsert,
  syncBullions,
};
