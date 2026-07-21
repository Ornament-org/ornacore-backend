import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { collectionService } from "./collection.service.js";

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
    const result = await collectionService.list(request.validated.query);
    response.json(ApiResponse.success({ data: result.rows, meta: result.meta }));
  } catch (error) {
    handleError(response, error);
  }
};

const getById = async (request, response) => {
  try {
    response.json(ApiResponse.success({ data: await collectionService.getById(request.validated.params.id) }));
  } catch (error) {
    handleError(response, error);
  }
};

/*
  POST /admin/collections
  { "name": "Wedding Collection", "shortDescription": "Bridal-ready sets", "mediaId": 12, "sortOrder": 0 }
*/
const create = async (request, response) => {
  try {
    const collection = await collectionService.create({ payload: request.validated.body, request });
    response.status(201).json(ApiResponse.success({ message: "Collection created successfully", data: collection }));
  } catch (error) {
    handleError(response, error);
  }
};

const update = async (request, response) => {
  try {
    const collection = await collectionService.update({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    response.json(ApiResponse.success({ message: "Collection updated successfully", data: collection }));
  } catch (error) {
    handleError(response, error);
  }
};

const remove = async (request, response) => {
  try {
    await collectionService.remove({ id: request.validated.params.id, request });
    response.json(ApiResponse.success({ message: "Collection deleted successfully" }));
  } catch (error) {
    handleError(response, error);
  }
};

// Fully unauthenticated — active collections for the storefront home page row,
// scoped to the given metal (plus metal-agnostic "All Metals" collections).
const publicList = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({ data: await collectionService.listActive(request.validated.query) }),
    );
  } catch (error) {
    handleError(response, error);
  }
};

export const collectionController = { list, getById, create, update, remove, publicList };
