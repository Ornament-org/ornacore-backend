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
    await queryInterface.createTable("ledger_transactions", {
      id: id(Sequelize),
      shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles", { onDelete: "RESTRICT" }),
      transaction_no: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      transaction_date: { type: Sequelize.DATEONLY, allowNull: false },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM("POSTED", "VOID"),
        allowNull: false,
        defaultValue: "POSTED",
      },
      created_by_user_id: foreignId(Sequelize, "users", { allowNull: true, onDelete: "SET NULL" }),
      updated_by_user_id: foreignId(Sequelize, "users", { allowNull: true, onDelete: "SET NULL" }),
      voided_by_user_id: foreignId(Sequelize, "users", { allowNull: true, onDelete: "SET NULL" }),
      voided_at: { type: Sequelize.DATE, allowNull: true },
      void_reason: { type: Sequelize.TEXT, allowNull: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("ledger_transactions", ["shopkeeper_id", "transaction_date"], {
      name: "ledger_transactions_shopkeeper_date_idx",
    });
    await queryInterface.addIndex("ledger_transactions", ["status", "transaction_date"], {
      name: "ledger_transactions_status_date_idx",
    });

    await queryInterface.createTable("ledger_entries", {
      id: id(Sequelize),
      ledger_transaction_id: foreignId(Sequelize, "ledger_transactions", {
        onDelete: "CASCADE",
      }),
      entry_type: {
        type: Sequelize.ENUM("DELIVERY", "RECEIPT", "ADJUSTMENT", "RETURN"),
        allowNull: false,
      },
      metal_id: foreignId(Sequelize, "metals", { onDelete: "RESTRICT" }),
      quantity: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      rate: { type: Sequelize.DECIMAL(18, 4), allowNull: true },
      amount: { type: Sequelize.DECIMAL(18, 4), allowNull: true },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("ledger_entries", ["metal_id", "entry_type"], {
      name: "ledger_entries_metal_type_idx",
    });
    await queryInterface.addIndex("ledger_entries", ["ledger_transaction_id", "metal_id"], {
      name: "ledger_entries_transaction_metal_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ledger_entries");
    await queryInterface.dropTable("ledger_transactions");
  },
};
