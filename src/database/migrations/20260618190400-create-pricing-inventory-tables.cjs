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
    await queryInterface.createTable("price_groups", {
      id: id(Sequelize),
      code: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable("pricing_rules", {
      id: id(Sequelize),
      product_id: foreignId(Sequelize, "products", { allowNull: true, onDelete: "CASCADE" }),
      product_variant_id: foreignId(Sequelize, "product_variants", {
        allowNull: true,
        onDelete: "CASCADE",
      }),
      price_group_id: foreignId(Sequelize, "price_groups", {
        allowNull: true,
        onDelete: "CASCADE",
      }),
      rule_type: {
        type: Sequelize.ENUM(
          "FIXED",
          "METAL_RATE_BASED",
          "PERCENTAGE_MARGIN",
          "PERCENTAGE_DISCOUNT",
          "BULK",
        ),
        allowNull: false,
      },
      base_price: { type: Sequelize.DECIMAL(18, 4), allowNull: true },
      making_charge: { type: Sequelize.DECIMAL(18, 4), allowNull: true },
      percentage_value: { type: Sequelize.DECIMAL(9, 4), allowNull: true },
      minimum_quantity: { type: Sequelize.DECIMAL(14, 3), allowNull: true },
      configuration: { type: Sequelize.JSON, allowNull: true },
      priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      starts_at: { type: Sequelize.DATE, allowNull: true },
      ends_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable("shopkeeper_price_overrides", {
      id: id(Sequelize),
      shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles", { onDelete: "CASCADE" }),
      product_variant_id: foreignId(Sequelize, "product_variants", { onDelete: "CASCADE" }),
      override_price: { type: Sequelize.DECIMAL(18, 4), allowNull: false },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      starts_at: { type: Sequelize.DATE, allowNull: true },
      ends_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by_user_id: foreignId(Sequelize, "users"),
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex(
      "shopkeeper_price_overrides",
      ["shopkeeper_id", "product_variant_id", "is_active"],
      { name: "shopkeeper_price_overrides_lookup_idx" },
    );

    await queryInterface.createTable("inventories", {
      id: id(Sequelize),
      product_variant_id: {
        ...foreignId(Sequelize, "product_variants", { onDelete: "CASCADE" }),
        unique: true,
      },
      on_hand_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: "0.000",
      },
      reserved_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: "0.000",
      },
      damaged_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: "0.000",
      },
      reorder_level: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: "0.000",
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable("inventory_movements", {
      id: id(Sequelize),
      inventory_id: foreignId(Sequelize, "inventories", { onDelete: "CASCADE" }),
      movement_type: {
        type: Sequelize.ENUM(
          "STOCK_IN",
          "STOCK_OUT",
          "ADJUSTMENT",
          "RESERVATION",
          "RESERVATION_RELEASE",
          "DAMAGED",
          "RETURNED",
        ),
        allowNull: false,
      },
      quantity: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      balance_after: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      reference_type: { type: Sequelize.STRING(100), allowNull: true },
      reference_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      created_by_user_id: foreignId(Sequelize, "users"),
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("inventory_movements", ["reference_type", "reference_id"], {
      name: "inventory_movements_reference_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("inventory_movements");
    await queryInterface.dropTable("inventories");
    await queryInterface.dropTable("shopkeeper_price_overrides");
    await queryInterface.dropTable("pricing_rules");
    await queryInterface.dropTable("price_groups");
  },
};
