import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { homepageService } from "./homepage.service.js";

const resolve = async (request, response, next) => {
  try {
    const { audience, metalId } = request.validated.query;
    const data = await homepageService.resolveHomepage({ audience, metalId });
    response.json(ApiResponse.success({ data }));
  } catch (error) {
    next(error);
  }
};

const resolveForShopkeeper = async (request, response, next) => {
  try {
    const { metalId } = request.validated.query;
    const data = await homepageService.resolveHomepage({ audience: "B2B", metalId });
    response.json(ApiResponse.success({ data }));
  } catch (error) {
    next(error);
  }
};

const list = async (request, response, next) => {
  try {
    const { audience, metalId, status } = request.validated.query;
    const data = await homepageService.listConfigs({ audience, metalId, status });
    response.json(ApiResponse.success({ data }));
  } catch (error) {
    next(error);
  }
};

const getOne = async (request, response, next) => {
  try {
    const data = await homepageService.getConfigWithSections(request.validated.params.id);
    response.json(ApiResponse.success({ data }));
  } catch (error) {
    next(error);
  }
};

const create = async (request, response, next) => {
  try {
    const data = await homepageService.createConfig({ ...request.validated.body, request });
    response.status(201).json(ApiResponse.success({ message: "Homepage created", data }));
  } catch (error) {
    next(error);
  }
};

const update = async (request, response, next) => {
  try {
    const data = await homepageService.updateConfig(
      request.validated.params.id,
      request.validated.body,
      request,
    );
    response.json(ApiResponse.success({ message: "Homepage updated", data }));
  } catch (error) {
    next(error);
  }
};

const addSection = async (request, response, next) => {
  try {
    const data = await homepageService.addSection(
      request.validated.params.id,
      request.validated.body,
      request,
    );
    response.status(201).json(ApiResponse.success({ message: "Section added", data }));
  } catch (error) {
    next(error);
  }
};

const updateSection = async (request, response, next) => {
  try {
    const data = await homepageService.updateSection(
      request.validated.params.id,
      request.validated.params.sectionId,
      request.validated.body,
      request,
    );
    response.json(ApiResponse.success({ message: "Section updated", data }));
  } catch (error) {
    next(error);
  }
};

const deleteSection = async (request, response, next) => {
  try {
    await homepageService.deleteSection(
      request.validated.params.id,
      request.validated.params.sectionId,
      request,
    );
    response.json(ApiResponse.success({ message: "Section removed" }));
  } catch (error) {
    next(error);
  }
};

const duplicateSection = async (request, response, next) => {
  try {
    const data = await homepageService.duplicateSection(
      request.validated.params.id,
      request.validated.params.sectionId,
      request,
    );
    response.status(201).json(ApiResponse.success({ message: "Section duplicated", data }));
  } catch (error) {
    next(error);
  }
};

const reorderSections = async (request, response, next) => {
  try {
    const data = await homepageService.reorderSections(
      request.validated.params.id,
      request.validated.body.order,
      request,
    );
    response.json(ApiResponse.success({ message: "Sections reordered", data }));
  } catch (error) {
    next(error);
  }
};

export const homepageController = {
  resolve,
  resolveForShopkeeper,
  list,
  getOne,
  create,
  update,
  addSection,
  updateSection,
  deleteSection,
  duplicateSection,
  reorderSections,
};
