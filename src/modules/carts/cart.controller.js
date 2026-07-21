import Decimal from "decimal.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { pricingService } from "../pricing/pricing.service.js";

export const cartInclude = [
  {
    model: db.CartItem,
    as: "items",
    include: [
      {
        model: db.ProductVariant,
        as: "variant",
        include: [
          {
            model: db.Product,
            as: "product",
            include: [
              { model: db.Metal, as: "metal" },
              {
                model: db.ProductImage,
                as: "images",
                required: false,
                include: [{ model: db.Media, as: "media", required: false }],
              },
            ],
          },
          { model: db.Inventory, as: "inventory", required: false },
        ],
      },
    ],
  },
];

// B2B ordering here runs on weight, not price — a wholesale rate isn't
// always configured for every SKU (it moves with the daily metal rate), and
// that shouldn't block a shop from adding a piece to their cart. Falls back
// to an unpriced line instead of failing the request; the cart/order total
// that actually matters to a shopkeeper is the weight-by-metal breakdown
// below, not this price.
const priceOrUnpriced = async (params) => {
  try {
    return await pricingService.calculateVariantPrice(params);
  } catch {
    return { unitPrice: new Decimal(0), snapshot: { configured: false } };
  }
};

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
  const weightByMetal = new Map();
  cart.items.forEach((item) => {
    const metalName = item.variant?.product?.metal?.name ?? "Other";
    const lineWeight = new Decimal(item.variant?.weightGrams ?? 0).mul(item.quantity);
    weightByMetal.set(metalName, (weightByMetal.get(metalName) ?? new Decimal(0)).plus(lineWeight));
  });
  return {
    ...cart.toJSON(),
    total: total.toFixed(4),
    weightByMetal: Object.fromEntries(
      Array.from(weightByMetal.entries()).map(([metalName, weight]) => [metalName, weight.toFixed(3)]),
    ),
  };
};

const getCart = async (request, response) => {
  try {
    const cart = await getActiveCart(request.shopkeeper.id);
    response.json(ApiResponse.success({ data: cartDto(cart) }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const addItem = async (request, response) => {
  try {
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
      const price = await priceOrUnpriced({
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const updateItem = async (request, response) => {
  try {
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
      const price = await priceOrUnpriced({
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const removeItem = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const cartController = {
  getCart,
  addItem,
  updateItem,
  removeItem,
};
