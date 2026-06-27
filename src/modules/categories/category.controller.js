import { CATEGORY_STATUSES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { categoryService } from "./category.service.js";
import { buildCategoryTree } from "./category.tree.js";

const shopkeeperCategoryInclude = [
  { model: db.Media, as: "image", required: false },
  { model: db.Metal, as: "metal", required: false },
];

const getShopkeeperCategoryWhere = (query) => ({
  status: CATEGORY_STATUSES.ACTIVE,
  ...(query.metalId ? { metalId: query.metalId } : {}),
});

const list = async (request, response) => {
  try {
    const result = await categoryService.list(request.validated.query);
    return response.json(
      ApiResponse.success({
        message: "Categories fetched successfully",
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

const tree = async (request, response) => {
  try {
    return response.json(
      ApiResponse.success({
        message: "Category tree fetched successfully",
        data: await categoryService.tree(request.query),
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
        data: await categoryService.getById(request.validated.params.id),
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
  POST /admin/categories
  { "name": "Rings", "parentId": null, "metalId": 1, "shortDescription": "Ring collection", "mediaId": null, "sortOrder": 0 }
*/
const create = async (request, response) => {
  try {
    const category = await categoryService.create({
      payload: request.validated.body,
      request,
    });
    return response
      .status(201)
      .json(ApiResponse.success({ message: "Category created successfully", data: category }));
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
  PATCH /admin/categories/:id
  { "name": "Gold Rings", "status": "ACTIVE", "sortOrder": 1 }
*/
const update = async (request, response) => {
  try {
    const category = await categoryService.update({
      id: request.validated.params.id,
      payload: request.validated.body,
      request,
    });
    return response.json(
      ApiResponse.success({ message: "Category updated successfully", data: category }),
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

const remove = async (request, response) => {
  try {
    await categoryService.remove({ id: request.validated.params.id, request });
    return response.json(ApiResponse.success({ message: "Category deleted successfully" }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const shopkeeperTree = async (request, response) => {
  try {
    const rows = await db.Category.findAll({
      where: getShopkeeperCategoryWhere(request.query),
      attributes: {
        include: [
          [
            db.sequelize.literal(
              "(SELECT COUNT(*) FROM categories children WHERE children.parent_id = Category.id AND children.is_deleted = false AND children.status = 'ACTIVE')",
            ),
            "childCount",
          ],
          [
            db.sequelize.literal(
              `(SELECT COUNT(DISTINCT productMappings.product_id)
               FROM product_category_mappings productMappings
               INNER JOIN products productsForCount ON productsForCount.id = productMappings.product_id
               WHERE productMappings.category_id = Category.id
                 AND productsForCount.status = 'ACTIVE')`,
            ),
            "productCount",
          ],
        ],
      },
      include: shopkeeperCategoryInclude,
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
    });
    const flat = rows.map((row) => row.toJSON());
    return response.json(
      ApiResponse.success({
        message: "Category tree fetched successfully",
        data: { tree: buildCategoryTree(flat), flat },
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

const shopkeeperList = async (request, response) => {
  try {
    const rows = await db.Category.findAll({
      where: getShopkeeperCategoryWhere(request.query),
      include: shopkeeperCategoryInclude,
      order: [["sortOrder", "ASC"], ["name", "ASC"]],
    });
    return response.json(
      ApiResponse.success({
        message: "Categories fetched successfully",
        data: rows,
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

export const categoryController = {
  // List categories with pagination and filtering
  list,
  // Get category tree structure with parent-child relationships
  tree,
  // Get category by ID
  getById,
  // Create new category
  create,
  // Update category by ID
  update,
  // Delete category by ID
  remove,
  shopkeeperTree,
  shopkeeperList,
};
