"use strict";

const timestamps = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
});

const id = (Sequelize) => ({
  type: Sequelize.BIGINT.UNSIGNED,
  autoIncrement: true,
  primaryKey: true,
  allowNull: false,
});

const foreignId = (Sequelize, model, { allowNull = false, onDelete = "RESTRICT" } = {}) => ({
  type: Sequelize.BIGINT.UNSIGNED,
  allowNull,
  references: { model, key: "id" },
  onUpdate: "CASCADE",
  onDelete,
});

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("carts", {
      id: id(Sequelize),
      shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles", { onDelete: "CASCADE" }),
      status: {
        type: Sequelize.ENUM("ACTIVE", "CONVERTED", "ABANDONED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: "INR" },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("carts", ["shopkeeper_id", "status"], {
      name: "carts_shopkeeper_status_idx",
    });

    await queryInterface.createTable("cart_items", {
      id: id(Sequelize),
      cart_id: foreignId(Sequelize, "carts", { onDelete: "CASCADE" }),
      product_variant_id: foreignId(Sequelize, "product_variants", { onDelete: "CASCADE" }),
      quantity: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      unit_price_snapshot: { type: Sequelize.DECIMAL(18, 4), allowNull: false },
      pricing_snapshot: { type: Sequelize.JSON, allowNull: false },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("cart_items", ["cart_id", "product_variant_id"], {
      unique: true,
      name: "cart_items_cart_variant_uq",
    });

    await queryInterface.createTable("orders", {
      id: id(Sequelize),
      order_number: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles"),
      placed_by_user_id: foreignId(Sequelize, "users"),
      assigned_staff_id: foreignId(Sequelize, "staff_profiles", {
        allowNull: true,
        onDelete: "SET NULL",
      }),
      status: {
        type: Sequelize.ENUM(
          "REQUESTED",
          "PRICE_CONFIRMED",
          "CONFIRMED",
          "PACKED",
          "DISPATCHED",
          "DELIVERED",
          "CANCELLED",
        ),
        allowNull: false,
        defaultValue: "REQUESTED",
      },
      payment_status: {
        type: Sequelize.ENUM("UNPAID", "PARTIALLY_PAID", "PAID", "CREDIT", "REFUNDED"),
        allowNull: false,
        defaultValue: "UNPAID",
      },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: "INR" },
      subtotal: { type: Sequelize.DECIMAL(18, 4), allowNull: false },
      discount_total: {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: "0.0000",
      },
      tax_total: {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: "0.0000",
      },
      grand_total: { type: Sequelize.DECIMAL(18, 4), allowNull: false },
      pricing_snapshot: { type: Sequelize.JSON, allowNull: false },
      tax_snapshot: { type: Sequelize.JSON, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      confirmed_at: { type: Sequelize.DATE, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("orders", ["status", "created_at"], {
      name: "orders_status_created_idx",
    });
    await queryInterface.addIndex("orders", ["shopkeeper_id", "created_at"], {
      name: "orders_shopkeeper_created_idx",
    });

    await queryInterface.createTable("order_items", {
      id: id(Sequelize),
      order_id: foreignId(Sequelize, "orders", { onDelete: "CASCADE" }),
      product_id: foreignId(Sequelize, "products"),
      product_variant_id: foreignId(Sequelize, "product_variants"),
      product_name_snapshot: { type: Sequelize.STRING(191), allowNull: false },
      sku_snapshot: { type: Sequelize.STRING(100), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      unit_price: { type: Sequelize.DECIMAL(18, 4), allowNull: false },
      line_subtotal: { type: Sequelize.DECIMAL(18, 4), allowNull: false },
      discount_amount: {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: "0.0000",
      },
      tax_amount: {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: "0.0000",
      },
      line_total: { type: Sequelize.DECIMAL(18, 4), allowNull: false },
      pricing_snapshot: { type: Sequelize.JSON, allowNull: false },
      tax_snapshot: { type: Sequelize.JSON, allowNull: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable("order_status_history", {
      id: id(Sequelize),
      order_id: foreignId(Sequelize, "orders", { onDelete: "CASCADE" }),
      from_status: {
        type: Sequelize.ENUM(
          "REQUESTED",
          "PRICE_CONFIRMED",
          "CONFIRMED",
          "PACKED",
          "DISPATCHED",
          "DELIVERED",
          "CANCELLED",
        ),
        allowNull: true,
      },
      to_status: {
        type: Sequelize.ENUM(
          "REQUESTED",
          "PRICE_CONFIRMED",
          "CONFIRMED",
          "PACKED",
          "DISPATCHED",
          "DELIVERED",
          "CANCELLED",
        ),
        allowNull: false,
      },
      note: { type: Sequelize.STRING(500), allowNull: true },
      changed_by_user_id: foreignId(Sequelize, "users"),
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("payments", {
      id: id(Sequelize),
      payment_number: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      order_id: foreignId(Sequelize, "orders", { allowNull: true, onDelete: "SET NULL" }),
      shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles"),
      method: {
        type: Sequelize.ENUM("CASH", "BANK_TRANSFER", "UPI", "ONLINE_GATEWAY", "CREDIT"),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("UNPAID", "PARTIALLY_PAID", "PAID", "CREDIT", "REFUNDED"),
        allowNull: false,
      },
      amount: { type: Sequelize.DECIMAL(18, 4), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: "INR" },
      external_reference: { type: Sequelize.STRING(191), allowNull: true },
      received_at: { type: Sequelize.DATE, allowNull: true },
      recorded_by_user_id: foreignId(Sequelize, "users"),
      notes: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable("deliveries", {
      id: id(Sequelize),
      order_id: {
        ...foreignId(Sequelize, "orders", { onDelete: "CASCADE" }),
        unique: true,
      },
      status: {
        type: Sequelize.ENUM(
          "PENDING",
          "READY",
          "DISPATCHED",
          "IN_TRANSIT",
          "DELIVERED",
          "FAILED",
          "RETURNED",
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },
      courier_name: { type: Sequelize.STRING(150), allowNull: true },
      tracking_number: { type: Sequelize.STRING(191), allowNull: true },
      tracking_url: { type: Sequelize.TEXT, allowNull: true },
      dispatched_at: { type: Sequelize.DATE, allowNull: true },
      estimated_delivery_at: { type: Sequelize.DATE, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      proof_media_id: foreignId(Sequelize, "media", { allowNull: true, onDelete: "SET NULL" }),
      notes: { type: Sequelize.TEXT, allowNull: true },
      ...timestamps(Sequelize),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("deliveries");
    await queryInterface.dropTable("payments");
    await queryInterface.dropTable("order_status_history");
    await queryInterface.dropTable("order_items");
    await queryInterface.dropTable("orders");
    await queryInterface.dropTable("cart_items");
    await queryInterface.dropTable("carts");
  },
};
