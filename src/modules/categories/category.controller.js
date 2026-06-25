import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { categoryService } from "./category.service.js";

export const categoryController = {
  // List categories with pagination and filtering
  async list(request, response) {
    const result = await categoryService.list(request.validated.query);
    return response.json(
      ApiResponse.success({
        message: "Categories fetched successfully",
        data: result.rows,
        meta: result.meta,
      }),
    );
  },

  // Get category tree structure with parent-child relationships
  async tree(request, response) {
    return response.json(
      ApiResponse.success({
        message: "Category tree fetched successfully",
        data: await categoryService.tree(request.query),
      }),
    );
  },

  // Get category by ID
  async getById(request, response) {
    return response.json(
      ApiResponse.success({
        data: await categoryService.getById(request.validated.params.id),
      }),
    );
  },

  // Create new category
  async create(request, response) {
    const category = await categoryService.create({
      payload: request.validated.body,
      request,
    });
    return response
      .status(201)
      .json(ApiResponse.success({ message: "Category created successfully", data: category }));
  },

  // Update category by ID
  async update(request, response) {
    const category = await categoryService.update({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({ message: "Category updated successfully", data: category }),
    );
  },

  // Delete category by ID
  async remove(request, response) {
    await categoryService.remove({ id: request.validated.params.id, request });
    return response.json(ApiResponse.success({ message: "Category deleted successfully" }));
  },
};
