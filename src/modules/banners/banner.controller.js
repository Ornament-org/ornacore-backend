import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { bannerService } from "./banner.service.js";

const handleError = (response, error) => {
  response.status(error.statusCode || 500).json(
    ApiResponse.error({
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "An unexpected error occurred",
    }),
  );
};

const list = async (request, response) => {
  try {
    const result = await bannerService.list(request.validated.query);
    response.json(ApiResponse.success({ data: result.rows, meta: result.meta }));
  } catch (error) {
    handleError(response, error);
  }
};

const getById = async (request, response) => {
  try {
    response.json(ApiResponse.success({ data: await bannerService.getById(request.validated.params.id) }));
  } catch (error) {
    handleError(response, error);
  }
};

const create = async (request, response) => {
  try {
    const banner = await bannerService.create({ payload: request.validated.body, request });
    response.status(201).json(ApiResponse.success({ message: "Banner created successfully", data: banner }));
  } catch (error) {
    handleError(response, error);
  }
};

const update = async (request, response) => {
  try {
    const banner = await bannerService.update({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    response.json(ApiResponse.success({ message: "Banner updated successfully", data: banner }));
  } catch (error) {
    handleError(response, error);
  }
};

const remove = async (request, response) => {
  try {
    await bannerService.remove({ id: request.validated.params.id, request });
    response.json(ApiResponse.success({ message: "Banner deleted successfully" }));
  } catch (error) {
    handleError(response, error);
  }
};

const reorder = async (request, response) => {
  try {
    await bannerService.reorder({ order: request.validated.body.order, request });
    response.json(ApiResponse.success({ message: "Banner order updated successfully" }));
  } catch (error) {
    handleError(response, error);
  }
};

// Fully unauthenticated — active, in-schedule banners, either by a named
// placement (legacy/other pages) or by an explicit homepage-curated id list.
const publicListByPlacement = async (request, response) => {
  try {
    const { placement, ids, metalId } = request.validated.query;
    const banners = ids?.length
      ? await bannerService.listActive({ metalId, ids })
      : await bannerService.listByPlacementKey(placement);
    response.json(ApiResponse.success({ data: banners }));
  } catch (error) {
    handleError(response, error);
  }
};

export const bannerController = { list, getById, create, update, remove, reorder, publicListByPlacement };
