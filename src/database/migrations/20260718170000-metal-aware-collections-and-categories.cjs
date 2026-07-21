"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const categoriesTable = await queryInterface.describeTable("categories");
    if (!categoriesTable.featured_on_home) {
      await queryInterface.addColumn("categories", "featured_on_home", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await queryInterface.addColumn("categories", "home_sort_order", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      });
      await queryInterface.addIndex("categories", ["featured_on_home"], {
        name: "ix_categories_featured_on_home",
      });
    }

    const collectionsTable = await queryInterface.describeTable("collections");
    if (!collectionsTable.metal_id) {
      await queryInterface.addColumn("collections", "metal_id", {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "metals", key: "id" },
        onDelete: "SET NULL",
      });
      await queryInterface.addIndex("collections", ["metal_id"], {
        name: "ix_collections_metal_id",
      });
    }

    const tables = await queryInterface.showAllTables();
    if (!tables.includes("collection_products")) {
      await queryInterface.createTable("collection_products", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        collection_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "collections", key: "id" },
          onDelete: "CASCADE",
        },
        product_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "products", key: "id" },
          onDelete: "CASCADE",
        },
        sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });

      await queryInterface.addIndex("collection_products", ["collection_id", "product_id"], {
        name: "ux_collection_products_collection_product",
        unique: true,
      });
      await queryInterface.addIndex("collection_products", ["sort_order"], {
        name: "ix_collection_products_sort_order",
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("collection_products")) {
      await queryInterface.dropTable("collection_products");
    }

    const collectionsTable = await queryInterface.describeTable("collections");
    if (collectionsTable.metal_id) {
      await queryInterface.removeColumn("collections", "metal_id");
    }

    const categoriesTable = await queryInterface.describeTable("categories");
    if (categoriesTable.featured_on_home) {
      await queryInterface.removeColumn("categories", "featured_on_home");
      await queryInterface.removeColumn("categories", "home_sort_order");
    }
  },
};
