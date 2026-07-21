import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { bannerPlaceholderService } from "./banner-placeholder.service.js";

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
    response.json(ApiResponse.success({ data: await bannerPlaceholderService.list(request.validated.query) }));
  } catch (error) {
    handleError(response, error);
  }
};

const getById = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({ data: await bannerPlaceholderService.getById(request.validated.params.id) }),
    );
  } catch (error) {
    handleError(response, error);
  }
};

const create = async (request, response) => {
  try {
    const placeholder = await bannerPlaceholderService.create({ payload: request.validated.body, request });
    response
      .status(201)
      .json(ApiResponse.success({ message: "Banner placement created successfully", data: placeholder }));
  } catch (error) {
    handleError(response, error);
  }
};

const update = async (request, response) => {
  try {
    const placeholder = await bannerPlaceholderService.update({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    response.json(ApiResponse.success({ message: "Banner placement updated successfully", data: placeholder }));
  } catch (error) {
    handleError(response, error);
  }
};

const remove = async (request, response) => {
  try {
    await bannerPlaceholderService.remove({ id: request.validated.params.id, request });
    response.json(ApiResponse.success({ message: "Banner placement deleted successfully" }));
  } catch (error) {
    handleError(response, error);
  }
};

export const bannerPlaceholderController = { list, getById, create, update, remove };
