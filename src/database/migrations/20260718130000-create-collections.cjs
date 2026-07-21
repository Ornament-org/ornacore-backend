"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("collections")) return;

    await queryInterface.createTable("collections", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      short_description: { type: Sequelize.STRING(500), allowNull: true },
      media_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "media", key: "id" },
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      is_deleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_by_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      updated_by_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("collections", ["status"], { name: "ix_collections_status" });
    await queryInterface.addIndex("collections", ["is_deleted"], { name: "ix_collections_is_deleted" });
    await queryInterface.addIndex("collections", ["sort_order"], { name: "ix_collections_sort_order" });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("collections")) await queryInterface.dropTable("collections");
  },
};
