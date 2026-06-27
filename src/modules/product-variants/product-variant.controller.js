import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { productVariantService } from "./product-variant.service.js";

const list = async (request, response) => {
  try {
    const result = await productVariantService.list(request.validated.query);
    return response.json(
      ApiResponse.success({
        message: "product-variants fetched successfully",
        data: result.rows,
        meta: result.meta,
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

const getById = async (request, response) => {
  try {
    return response.json(
      ApiResponse.success({
        data: await productVariantService.getById(request.validated.params.id),
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

/*
  POST /admin/product-variants
  {
    "productId": 5,
    "sku": "RNG-001-18K",
    "purity": "18K",
    "tunch": 75.0,
    "weightGrams": 4.2,
    "minimumOrderQuantity": 1,
    "attributes": { "size": "7", "finish": "matte" },
    "isActive": true
  }
*/
const create = async (request, response) => {
  try {
    const productVariant = await productVariantService.create({
      payload: request.validated.body,
      request,
    });
    return response.status(201).json(
      ApiResponse.success({
        message: "ProductVariant created successfully",
        data: productVariant,
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

/*
  PATCH /admin/product-variants/:id
  { "tunch": 92.0, "weightGrams": 4.5, "isActive": true, "minimumOrderQuantity": 2 }
*/
const update = async (request, response) => {
  try {
    const productVariant = await productVariantService.update({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({
        message: "ProductVariant updated successfully",
        data: productVariant,
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

/*
  DELETE /admin/product-variants/:id
  (no body)
*/
const remove = async (request, response) => {
  try {
    await productVariantService.remove({ id: request.validated.params.id, request });
    return response.json(ApiResponse.success({ message: "ProductVariant deleted successfully" }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const productVariantController = {
  // List product variants with pagination and filtering
  list,
  // Get product variant by ID
  getById,
  // Create new product variant
  create,
  // Update product variant by ID
  update,
  // Delete product variant by ID
  remove,
};
