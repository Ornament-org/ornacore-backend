import { z } from "zod";
import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createModuleRouter } from "../module.router.js";
import { cartController } from "./cart.controller.js";

export const cartShopkeeperRouter = createModuleRouter();

const itemSchema = z.object({
  body: z.object({
    productVariantId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().positive(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const updateItemSchema = z.object({
  body: z.object({ quantity: z.coerce.number().positive() }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

const idSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

cartShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);

cartShopkeeperRouter.get(
  "/",
  asyncHandler(cartController.getCart),
);

cartShopkeeperRouter.post(
  "/items",
  validate(itemSchema),
  asyncHandler(cartController.addItem),
);

cartShopkeeperRouter.patch(
  "/items/:id",
  validate(updateItemSchema),
  asyncHandler(cartController.updateItem),
);

cartShopkeeperRouter.delete(
  "/items/:id",
  validate(idSchema),
  asyncHandler(cartController.removeItem),
);
