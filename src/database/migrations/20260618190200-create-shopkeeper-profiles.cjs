"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("shopkeeper_profiles", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      owner_name: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      shop_name: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      address_line1: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      address_line2: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      state: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      pincode: {
        type: Sequelize.STRING(12),
        allowNull: true,
      },
      gst_number: {
        type: Sequelize.STRING(32),
        allowNull: true,
        unique: true,
      },
      business_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      onboarding_step: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "SUBMITTED",
      },
      status: {
        type: Sequelize.ENUM(
          "DRAFT",
          "PENDING_REVIEW",
          "APPROVED",
          "REJECTED",
          "SUSPENDED",
          "BLOCKED",
        ),
        allowNull: false,
        defaultValue: "PENDING_REVIEW",
      },
      price_group_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      credit_limit: {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: "0.0000",
      },
      is_order_allowed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      assigned_salesperson_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      approved_by_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      last_transaction_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("shopkeeper_profiles", ["status", "created_at"], {
      name: "shopkeeper_profiles_status_created_idx",
    });
    await queryInterface.addIndex("shopkeeper_profiles", ["assigned_salesperson_id"], {
      name: "shopkeeper_profiles_salesperson_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("shopkeeper_profiles");
  },
};
