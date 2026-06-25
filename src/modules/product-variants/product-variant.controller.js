import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { productVariantService } from "./product-variant.service.js";

export const productVariantController = {
  // List product variants with pagination and filtering
  async list(request, response) {
    const result = await productVariantService.list(request.validated.query);
    return response.json(
      ApiResponse.success({
        message: "product-variants fetched successfully",
        data: result.rows,
        meta: result.meta,
      }),
    );
  },

  // Get product variant by ID
  async getById(request, response) {
    return response.json(
      ApiResponse.success({
        data: await productVariantService.getById(request.validated.params.id),
      }),
    );
  },

  // Create new product variant
  async create(request, response) {
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
  },

  // Update product variant by ID
  async update(request, response) {
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
  },

  // Delete product variant by ID
  async remove(request, response) {
    await productVariantService.remove({ id: request.validated.params.id, request });
    return response.json(ApiResponse.success({ message: "ProductVariant deleted successfully" }));
  },
};
