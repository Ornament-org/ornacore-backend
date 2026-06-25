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
    await queryInterface.createTable("notifications", {
      id: id(Sequelize),
      user_id: foreignId(Sequelize, "users", { onDelete: "CASCADE" }),
      event_type: { type: Sequelize.STRING(120), allowNull: false },
      channel: {
        type: Sequelize.ENUM("IN_APP", "EMAIL", "SMS", "PUSH", "WHATSAPP"),
        allowNull: false,
      },
      title: { type: Sequelize.STRING(191), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      payload: { type: Sequelize.JSON, allowNull: true },
      status: {
        type: Sequelize.ENUM("PENDING", "SENT", "FAILED", "READ"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      read_at: { type: Sequelize.DATE, allowNull: true },
      failure_reason: { type: Sequelize.TEXT, allowNull: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable("audit_logs", {
      id: id(Sequelize),
      actor_user_id: foreignId(Sequelize, "users", { allowNull: true, onDelete: "SET NULL" }),
      action: { type: Sequelize.STRING(150), allowNull: false },
      module: { type: Sequelize.STRING(100), allowNull: false },
      entity_type: { type: Sequelize.STRING(100), allowNull: true },
      entity_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      old_value: { type: Sequelize.JSON, allowNull: true },
      new_value: { type: Sequelize.JSON, allowNull: true },
      request_id: { type: Sequelize.STRING(64), allowNull: true },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("audit_logs", ["module", "action", "created_at"], {
      name: "audit_logs_module_action_created_idx",
    });
    await queryInterface.addIndex("audit_logs", ["entity_type", "entity_id"], {
      name: "audit_logs_entity_idx",
    });

    await queryInterface.createTable("ledger_accounts", {
      id: id(Sequelize),
      code: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(191), allowNull: false },
      account_type: {
        type: Sequelize.ENUM("ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"),
        allowNull: false,
      },
      owner_type: { type: Sequelize.ENUM("SYSTEM", "SHOPKEEPER"), allowNull: false },
      shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles", {
        allowNull: true,
        onDelete: "CASCADE",
      }),
      parent_account_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: "INR" },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint("ledger_accounts", {
      fields: ["parent_account_id"],
      type: "foreign key",
      name: "ledger_accounts_parent_fk",
      references: { table: "ledger_accounts", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addIndex("ledger_accounts", ["shopkeeper_id", "account_type"], {
      name: "ledger_accounts_shopkeeper_type_idx",
    });

    await queryInterface.createTable("journal_entries", {
      id: id(Sequelize),
      entry_number: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      entry_date: { type: Sequelize.DATE, allowNull: false },
      description: { type: Sequelize.STRING(500), allowNull: false },
      source_type: { type: Sequelize.STRING(100), allowNull: false },
      source_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      status: {
        type: Sequelize.ENUM("DRAFT", "POSTED", "REVERSED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      reversal_of_entry_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      posted_by_user_id: foreignId(Sequelize, "users", {
        allowNull: true,
        onDelete: "SET NULL",
      }),
      posted_at: { type: Sequelize.DATE, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint("journal_entries", {
      fields: ["reversal_of_entry_id"],
      type: "foreign key",
      name: "journal_entries_reversal_fk",
      references: { table: "journal_entries", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addIndex("journal_entries", ["source_type", "source_id"], {
      name: "journal_entries_source_idx",
    });

    await queryInterface.createTable("journal_lines", {
      id: id(Sequelize),
      journal_entry_id: foreignId(Sequelize, "journal_entries", { onDelete: "CASCADE" }),
      ledger_account_id: foreignId(Sequelize, "ledger_accounts"),
      side: { type: Sequelize.ENUM("DEBIT", "CREDIT"), allowNull: false },
      amount: { type: Sequelize.DECIMAL(18, 4), allowNull: false },
      memo: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addConstraint("shopkeeper_profiles", {
      fields: ["price_group_id"],
      type: "foreign key",
      name: "shopkeeper_profiles_price_group_fk",
      references: { table: "price_groups", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addConstraint("shopkeeper_profiles", {
      fields: ["assigned_salesperson_id"],
      type: "foreign key",
      name: "shopkeeper_profiles_salesperson_fk",
      references: { table: "staff_profiles", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      "shopkeeper_profiles",
      "shopkeeper_profiles_salesperson_fk",
    );
    await queryInterface.removeConstraint(
      "shopkeeper_profiles",
      "shopkeeper_profiles_price_group_fk",
    );
    await queryInterface.dropTable("journal_lines");
    await queryInterface.dropTable("journal_entries");
    await queryInterface.dropTable("ledger_accounts");
    await queryInterface.dropTable("audit_logs");
    await queryInterface.dropTable("notifications");
  },
};
