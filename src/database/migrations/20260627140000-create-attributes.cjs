"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes("attributes")) {
      await queryInterface.createTable("attributes", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        name: { type: Sequelize.STRING(100), allowNull: false },
        slug: { type: Sequelize.STRING(120), allowNull: false, unique: true },
        display_order: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
    }

    if (!tables.includes("attribute_values")) {
      await queryInterface.createTable("attribute_values", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        attribute_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "attributes", key: "id" },
          onDelete: "CASCADE",
        },
        value: { type: Sequelize.STRING(200), allowNull: false },
        display_order: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });

      await queryInterface.addIndex("attribute_values", ["attribute_id", "value"], {
        unique: true,
        name: "uq_attribute_value",
      });
      await queryInterface.addIndex("attribute_values", ["attribute_id", "display_order"], {
        name: "idx_attr_val_order",
      });
    }

    if (!tables.includes("product_variant_attributes")) {
      await queryInterface.createTable("product_variant_attributes", {
        variant_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          primaryKey: true,
          references: { model: "product_variants", key: "id" },
          onDelete: "CASCADE",
        },
        attribute_value_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          primaryKey: true,
          references: { model: "attribute_values", key: "id" },
          onDelete: "RESTRICT",
        },
      });

      await queryInterface.addIndex(
        "product_variant_attributes",
        ["attribute_value_id"],
        { name: "idx_pva_attr_value" },
      );
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("product_variant_attributes")) {
      await queryInterface.dropTable("product_variant_attributes");
    }
    if (tables.includes("attribute_values")) {
      await queryInterface.dropTable("attribute_values");
    }
    if (tables.includes("attributes")) {
      await queryInterface.dropTable("attributes");
    }
  },
};
