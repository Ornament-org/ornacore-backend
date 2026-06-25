import { PERMISSIONS } from "../../constants/permissions.js";
import { ACTOR_TYPES, CATEGORY_STATUSES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { categoryController } from "./category.controller.js";
import { buildCategoryTree } from "./category.tree.js";
import {
  categoryIdSchema,
  categoryListSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation.js";

export const categoryAdminRouter = createModuleRouter();
export const categoryShopkeeperRouter = createModuleRouter();

categoryAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.CATALOG_MANAGE),
  validate(categoryListSchema),
  asyncHandler(categoryController.list),
);
categoryAdminRouter.get(
  "/tree",
  ...protectAdmin(PERMISSIONS.CATALOG_MANAGE),
  asyncHandler(categoryController.tree),
);
categoryAdminRouter.get(
  "/:id",
  ...protectAdmin(PERMISSIONS.CATALOG_MANAGE),
  validate(categoryIdSchema),
  asyncHandler(categoryController.getById),
);
categoryAdminRouter.post(
  "/",
  ...protectAdmin(PERMISSIONS.CATALOG_MANAGE),
  validate(createCategorySchema),
  asyncHandler(categoryController.create),
);
categoryAdminRouter.patch(
  "/:id",
  ...protectAdmin(PERMISSIONS.CATALOG_MANAGE),
  validate(updateCategorySchema),
  asyncHandler(categoryController.update),
);
categoryAdminRouter.delete(
  "/:id",
  ...protectAdmin(PERMISSIONS.CATALOG_MANAGE),
  validate(categoryIdSchema),
  asyncHandler(categoryController.remove),
);

const shopkeeperCategoryInclude = [
  { model: db.Media, as: "image", required: false },
  { model: db.Metal, as: "metal", required: false },
];

const getShopkeeperCategoryWhere = (query) => ({
  status: CATEGORY_STATUSES.ACTIVE,
  ...(query.metalId ? { metalId: query.metalId } : {}),
});

categoryShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);

categoryShopkeeperRouter.get(
  "/tree",
  asyncHandler(async (request, response) => {
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
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
    });

    const flat = rows.map((row) => row.toJSON());
    response.json(
      ApiResponse.success({
        message: "Category tree fetched successfully",
        data: { tree: buildCategoryTree(flat), flat },
      }),
    );
  }),
);

categoryShopkeeperRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const rows = await db.Category.findAll({
      where: getShopkeeperCategoryWhere(request.query),
      include: shopkeeperCategoryInclude,
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
    });

    response.json(
      ApiResponse.success({
        message: "Categories fetched successfully",
        data: rows,
      }),
    );
  }),
);
