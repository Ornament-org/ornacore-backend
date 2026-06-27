import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { featureFlagService } from "./feature-flag.service.js";

const list = async (req, res) => {
  const result = await featureFlagService.list(req.validated.query);
  return res.json(ApiResponse.success({ data: result.rows, meta: result.meta }));
};

const stats = async (_req, res) => {
  const data = await featureFlagService.getStats();
  return res.json(ApiResponse.success({ data }));
};

const modules = async (_req, res) => {
  const data = await featureFlagService.distinctModules();
  return res.json(ApiResponse.success({ data }));
};

const getById = async (req, res) => {
  const data = await featureFlagService.getById(req.validated.params.id);
  return res.json(ApiResponse.success({ data }));
};

const getAuditTrail = async (req, res) => {
  const result = await featureFlagService.getAuditTrail(
    req.validated.params.id,
    req.validated.query,
  );
  return res.json(ApiResponse.success({ data: result.rows, meta: result.meta }));
};

const create = async (req, res) => {
  const data = await featureFlagService.create({ payload: req.validated.body, request: req });
  return res.status(201).json(ApiResponse.success({ message: "Feature flag created", data }));
};

const update = async (req, res) => {
  const data = await featureFlagService.update({
    id: req.validated.params.id,
    payload: req.validated.body,
    request: req,
  });
  return res.json(ApiResponse.success({ message: "Feature flag updated", data }));
};

const toggle = async (req, res) => {
  const data = await featureFlagService.toggle({ id: req.validated.params.id, request: req });
  return res.json(ApiResponse.success({ message: `Feature flag ${data.isEnabled ? "enabled" : "disabled"}`, data }));
};

const remove = async (req, res) => {
  await featureFlagService.remove({ id: req.validated.params.id, request: req });
  return res.json(ApiResponse.success({ message: "Feature flag deleted" }));
};

const publicConfig = async (req, res) => {
  const env = req.params.env ?? "all";
  const data = await featureFlagService.getPublicConfig(env);
  return res.json(ApiResponse.success({ data }));
};

export const featureFlagController = {
  list, stats, modules, getById, getAuditTrail, create, update, toggle, remove, publicConfig,
};
