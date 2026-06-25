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

const quantity = (Sequelize, { allowNull = false, defaultValue } = {}) => ({
  type: Sequelize.DECIMAL(14, 3),
  allowNull,
  ...(defaultValue !== undefined ? { defaultValue } : {}),
});

const money = (Sequelize, { allowNull = false } = {}) => ({
  type: Sequelize.DECIMAL(18, 4),
  allowNull,
});

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("khatabook_orders", {
      id: id(Sequelize),
      order_number: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles"),
      metal_id: foreignId(Sequelize, "metals"),
      entry_date: { type: Sequelize.DATE, allowNull: false },
      notes: { type: Sequelize.TEXT, allowNull: true },
      previous_due: quantity(Sequelize, { defaultValue: "0.000" }),
      fine_delivered: quantity(Sequelize, { defaultValue: "0.000" }),
      credit_received: quantity(Sequelize, { defaultValue: "0.000" }),
      total_before_collection: quantity(Sequelize, { defaultValue: "0.000" }),
      running_due: quantity(Sequelize, { defaultValue: "0.000" }),
      outstanding_due: quantity(Sequelize, { defaultValue: "0.000" }),
      credit_limit: quantity(Sequelize, { defaultValue: "0.000" }),
      attempted_due: quantity(Sequelize, { defaultValue: "0.000" }),
      exceeded_by: quantity(Sequelize, { defaultValue: "0.000" }),
      is_credit_limit_override: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: Sequelize.ENUM("UNSETTLED", "PARTIALLY_SETTLED", "SETTLED"),
        allowNull: false,
        defaultValue: "UNSETTLED",
      },
      created_by_user_id: foreignId(Sequelize, "users", { allowNull: true, onDelete: "SET NULL" }),
      updated_by_user_id: foreignId(Sequelize, "users", { allowNull: true, onDelete: "SET NULL" }),
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("khatabook_orders", ["shopkeeper_id", "metal_id", "entry_date"], {
      name: "khatabook_orders_shop_metal_date_idx",
    });
    await queryInterface.addIndex("khatabook_orders", ["shopkeeper_id", "status"], {
      name: "khatabook_orders_shop_status_idx",
    });

    await queryInterface.createTable("khatabook_order_items", {
      id: id(Sequelize),
      khatabook_order_id: foreignId(Sequelize, "khatabook_orders", { onDelete: "CASCADE" }),
      item_name: { type: Sequelize.STRING(191), allowNull: false },
      gross_weight: quantity(Sequelize),
      tunch: { type: Sequelize.DECIMAL(8, 3), allowNull: false },
      fine_weight: quantity(Sequelize),
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("khatabook_order_items", ["khatabook_order_id"], {
      name: "khatabook_order_items_order_idx",
    });

    await queryInterface.createTable("khatabook_collections", {
      id: id(Sequelize),
      source_order_id: foreignId(Sequelize, "khatabook_orders", {
        allowNull: true,
        onDelete: "SET NULL",
      }),
      shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles"),
      metal_id: foreignId(Sequelize, "metals"),
      collection_type: { type: Sequelize.ENUM("METAL", "CASH"), allowNull: false },
      received_quantity: quantity(Sequelize, { allowNull: true }),
      cash_amount: money(Sequelize, { allowNull: true }),
      metal_rate: money(Sequelize, { allowNull: true }),
      fine_credit: quantity(Sequelize),
      collection_date: { type: Sequelize.DATE, allowNull: false },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by_user_id: foreignId(Sequelize, "users", { allowNull: true, onDelete: "SET NULL" }),
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex(
      "khatabook_collections",
      ["shopkeeper_id", "metal_id", "collection_date"],
      { name: "khatabook_collections_shop_metal_date_idx" },
    );
    await queryInterface.addIndex("khatabook_collections", ["source_order_id"], {
      name: "khatabook_collections_source_order_idx",
    });

    await queryInterface.createTable("khatabook_settlements", {
      id: id(Sequelize),
      collection_id: foreignId(Sequelize, "khatabook_collections", { onDelete: "CASCADE" }),
      khatabook_order_id: foreignId(Sequelize, "khatabook_orders", { onDelete: "CASCADE" }),
      applied_fine: quantity(Sequelize),
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("khatabook_settlements", ["collection_id"], {
      name: "khatabook_settlements_collection_idx",
    });
    await queryInterface.addIndex("khatabook_settlements", ["khatabook_order_id"], {
      name: "khatabook_settlements_order_idx",
    });

    await queryInterface.createTable("khatabook_ledger_entries", {
      id: id(Sequelize),
      shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles"),
      metal_id: foreignId(Sequelize, "metals"),
      khatabook_order_id: foreignId(Sequelize, "khatabook_orders", {
        allowNull: true,
        onDelete: "CASCADE",
      }),
      collection_id: foreignId(Sequelize, "khatabook_collections", {
        allowNull: true,
        onDelete: "CASCADE",
      }),
      entry_date: { type: Sequelize.DATE, allowNull: false },
      entry_type: {
        type: Sequelize.ENUM("DELIVERY", "METAL_COLLECTION", "CASH_CONVERSION", "ADJUSTMENT"),
        allowNull: false,
      },
      debit_fine: quantity(Sequelize, { defaultValue: "0.000" }),
      credit_fine: quantity(Sequelize, { defaultValue: "0.000" }),
      running_balance: quantity(Sequelize, { defaultValue: "0.000" }),
      description: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex(
      "khatabook_ledger_entries",
      ["shopkeeper_id", "metal_id", "entry_date"],
      { name: "khatabook_ledger_entries_shop_metal_date_idx" },
    );
    await queryInterface.addIndex("khatabook_ledger_entries", ["khatabook_order_id"], {
      name: "khatabook_ledger_entries_order_idx",
    });
    await queryInterface.addIndex("khatabook_ledger_entries", ["collection_id"], {
      name: "khatabook_ledger_entries_collection_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("khatabook_ledger_entries");
    await queryInterface.dropTable("khatabook_settlements");
    await queryInterface.dropTable("khatabook_collections");
    await queryInterface.dropTable("khatabook_order_items");
    await queryInterface.dropTable("khatabook_orders");
  },
};
