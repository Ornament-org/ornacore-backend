import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { attributeService } from "./attribute.service.js";

const list = async (req, res) => {
  const result = await attributeService.list(req.validated.query);
  const data = result.rows.map((r) => r.toJSON());
  res.json(ApiResponse.success({ data, meta: result.meta }));
};

const getById = async (req, res) => {
  const attr = await attributeService.getById(req.validated.params.id);
  res.json(ApiResponse.success({ data: attr }));
};

const create = async (req, res) => {
  const attr = await attributeService.create(req.validated.body);
  res.status(201).json(ApiResponse.success({ message: "Attribute created", data: attr }));
};

const update = async (req, res) => {
  const attr = await attributeService.update(req.validated.params.id, req.validated.body);
  res.json(ApiResponse.success({ message: "Attribute updated", data: attr }));
};

const remove = async (req, res) => {
  await attributeService.remove(req.validated.params.id);
  res.json(ApiResponse.success({ message: "Attribute deleted" }));
};

const createValue = async (req, res) => {
  const val = await attributeService.createValue(req.validated.params.id, req.validated.body);
  res.status(201).json(ApiResponse.success({ message: "Value added", data: val }));
};

const updateValue = async (req, res) => {
  const val = await attributeService.updateValue(
    req.validated.params.id,
    req.validated.params.valueId,
    req.validated.body,
  );
  res.json(ApiResponse.success({ message: "Value updated", data: val }));
};

const removeValue = async (req, res) => {
  await attributeService.removeValue(req.validated.params.id, req.validated.params.valueId);
  res.json(ApiResponse.success({ message: "Value deleted" }));
};

const syncVariantAttributes = async (req, res) => {
  await attributeService.syncVariantAttributes(
    req.validated.params.id,
    req.validated.body.attributeValueIds,
  );
  res.json(ApiResponse.success({ message: "Variant attributes synced" }));
};

const getVariantAttributes = async (req, res) => {
  const rows = await attributeService.getVariantAttributes(req.validated.params.id);
  res.json(ApiResponse.success({ data: rows }));
};

export const attributeController = {
  list,
  getById,
  create,
  update,
  remove,
  createValue,
  updateValue,
  removeValue,
  syncVariantAttributes,
  getVariantAttributes,
};
