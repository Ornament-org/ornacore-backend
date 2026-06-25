import Decimal from "decimal.js";
import { z } from "zod";
import { ACTOR_TYPES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requireApprovedShopkeeper } from "../../middlewares/requireApprovedShopkeeper.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { pricingService } from "../pricing/pricing.service.js";
import { createModuleRouter } from "../module.router.js";

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

const cartInclude = [
  {
    model: db.CartItem,
    as: "items",
    include: [
      {
        model: db.ProductVariant,
        as: "variant",
        include: [
          { model: db.Product, as: "product" },
          { model: db.Inventory, as: "inventory", required: false },
        ],
      },
    ],
  },
];

const getActiveCart = async (shopkeeperId, transaction) => {
  const [cart] = await db.Cart.findOrCreate({
    where: { shopkeeperId, status: "ACTIVE" },
    defaults: { currency: "INR" },
    transaction,
  });
  return db.Cart.findByPk(cart.id, { include: cartInclude, transaction });
};

const cartDto = (cart) => {
  const total = cart.items.reduce(
    (sum, item) => sum.plus(new Decimal(item.unitPriceSnapshot).mul(item.quantity)),
    new Decimal(0),
  );
  return { ...cart.toJSON(), total: total.toFixed(4) };
};

cartShopkeeperRouter.use(
  authenticate,
  requireActorType(ACTOR_TYPES.SHOPKEEPER),
  requireApprovedShopkeeper,
);

cartShopkeeperRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const cart = await getActiveCart(request.shopkeeper.id);
    response.json(ApiResponse.success({ data: cartDto(cart) }));
  }),
);

cartShopkeeperRouter.post(
  "/items",
  validate(itemSchema),
  asyncHandler(async (request, response) => {
    const input = request.validated.body;
    const cart = await db.sequelize.transaction(async (transaction) => {
      const activeCart = await getActiveCart(request.shopkeeper.id, transaction);
      const variant = await db.ProductVariant.findByPk(input.productVariantId, {
        include: [
          { model: db.Product, as: "product" },
          { model: db.Inventory, as: "inventory", required: false },
        ],
        transaction,
      });
      if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") {
        throw new AppError("Product variant is unavailable", {
          statusCode: 409,
          code: "PRODUCT_UNAVAILABLE",
        });
      }
      if (new Decimal(input.quantity).lt(variant.minimumOrderQuantity)) {
        throw new AppError(`MOQ is ${variant.minimumOrderQuantity}`, {
          statusCode: 422,
          code: "MOQ_NOT_MET",
        });
      }
      const available = variant.inventory
        ? new Decimal(variant.inventory.onHandQuantity)
            .minus(variant.inventory.reservedQuantity)
            .minus(variant.inventory.damagedQuantity)
        : new Decimal(0);
      if (available.lt(input.quantity)) {
        throw new AppError("Insufficient stock", {
          statusCode: 409,
          code: "INSUFFICIENT_STOCK",
        });
      }
      const price = await pricingService.calculateVariantPrice({
        shopkeeper: request.shopkeeper,
        variant,
        quantity: input.quantity,
        transaction,
      });
      const [item, created] = await db.CartItem.findOrCreate({
        where: { cartId: activeCart.id, productVariantId: variant.id },
        defaults: {
          quantity: input.quantity,
          unitPriceSnapshot: price.unitPrice.toFixed(4),
          pricingSnapshot: price.snapshot,
        },
        transaction,
      });
      if (!created) {
        await item.update(
          {
            quantity: input.quantity,
            unitPriceSnapshot: price.unitPrice.toFixed(4),
            pricingSnapshot: price.snapshot,
          },
          { transaction },
        );
      }
      return getActiveCart(request.shopkeeper.id, transaction);
    });
    response.status(201).json(
      ApiResponse.success({
        message: "Cart item added successfully",
        data: cartDto(cart),
      }),
    );
  }),
);

cartShopkeeperRouter.patch(
  "/items/:id",
  validate(updateItemSchema),
  asyncHandler(async (request, response) => {
    const cart = await db.sequelize.transaction(async (transaction) => {
      const item = await db.CartItem.findByPk(request.validated.params.id, {
        include: [
          { model: db.Cart, as: "cart" },
          {
            model: db.ProductVariant,
            as: "variant",
            include: [
              { model: db.Product, as: "product" },
              { model: db.Inventory, as: "inventory", required: false },
            ],
          },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!item || String(item.cart.shopkeeperId) !== String(request.shopkeeper.id)) {
        throw new AppError("Cart item not found", {
          statusCode: 404,
          code: "CART_ITEM_NOT_FOUND",
        });
      }
      const quantity = new Decimal(request.validated.body.quantity);
      if (quantity.lt(item.variant.minimumOrderQuantity)) {
        throw new AppError(`MOQ is ${item.variant.minimumOrderQuantity}`, {
          statusCode: 422,
          code: "MOQ_NOT_MET",
        });
      }
      const available = item.variant.inventory
        ? new Decimal(item.variant.inventory.onHandQuantity)
            .minus(item.variant.inventory.reservedQuantity)
            .minus(item.variant.inventory.damagedQuantity)
        : new Decimal(0);
      if (available.lt(quantity)) {
        throw new AppError("Insufficient stock", {
          statusCode: 409,
          code: "INSUFFICIENT_STOCK",
        });
      }
      const price = await pricingService.calculateVariantPrice({
        shopkeeper: request.shopkeeper,
        variant: item.variant,
        quantity,
        transaction,
      });
      await item.update(
        {
          quantity: quantity.toFixed(3),
          unitPriceSnapshot: price.unitPrice.toFixed(4),
          pricingSnapshot: price.snapshot,
        },
        { transaction },
      );
      return getActiveCart(request.shopkeeper.id, transaction);
    });
    response.json(
      ApiResponse.success({
        message: "Cart item quantity updated successfully",
        data: cartDto(cart),
      }),
    );
  }),
);

cartShopkeeperRouter.delete(
  "/items/:id",
  validate(idSchema),
  asyncHandler(async (request, response) => {
    const item = await db.CartItem.findByPk(request.validated.params.id, {
      include: [{ model: db.Cart, as: "cart" }],
    });
    if (!item || String(item.cart.shopkeeperId) !== String(request.shopkeeper.id)) {
      throw new AppError("Cart item not found", {
        statusCode: 404,
        code: "CART_ITEM_NOT_FOUND",
      });
    }
    await item.destroy();
    response.json(ApiResponse.success({ message: "Cart item removed successfully" }));
  }),
);
