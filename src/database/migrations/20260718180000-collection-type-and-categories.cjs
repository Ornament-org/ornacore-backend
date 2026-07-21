"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const collectionsTable = await queryInterface.describeTable("collections");
    if (!collectionsTable.type) {
      await queryInterface.addColumn("collections", "type", {
        type: Sequelize.ENUM("CATEGORY", "PRODUCT"),
        allowNull: false,
        defaultValue: "PRODUCT",
      });
    }

    const tables = await queryInterface.showAllTables();
    if (!tables.includes("collection_categories")) {
      await queryInterface.createTable("collection_categories", {
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
        category_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "categories", key: "id" },
          onDelete: "CASCADE",
        },
        sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });

      await queryInterface.addIndex("collection_categories", ["collection_id", "category_id"], {
        name: "ux_collection_categories_collection_category",
        unique: true,
      });
      await queryInterface.addIndex("collection_categories", ["sort_order"], {
        name: "ix_collection_categories_sort_order",
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("collection_categories")) {
      await queryInterface.dropTable("collection_categories");
    }

    const collectionsTable = await queryInterface.describeTable("collections");
    if (collectionsTable.type) {
      await queryInterface.removeColumn("collections", "type");
    }
  },
};
