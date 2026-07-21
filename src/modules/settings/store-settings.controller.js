import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { storeSettingsService } from "./store-settings.service.js";

const get = async (req, res) => {
  const data = await storeSettingsService.get();
  return res.json(ApiResponse.success({ data: { storeSettings: data } }));
};

const branding = async (req, res) => {
  const data = await storeSettingsService.branding();
  return res.json(ApiResponse.success({ data }));
};

const update = async (req, res) => {
  const data = await storeSettingsService.update({ payload: req.validated.body, request: req });
  return res.json(ApiResponse.success({ message: "Store settings updated successfully", data: { storeSettings: data } }));
};

export const storeSettingsController = { get, branding, update };
