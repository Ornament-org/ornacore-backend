"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes("media_folders")) {
      await queryInterface.createTable("media_folders", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        name: { type: Sequelize.STRING(150), allowNull: false },
        parent_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: "media_folders", key: "id" },
          onDelete: "SET NULL",
        },
        created_by_user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
    }

    const mediaColumns = await queryInterface.describeTable("media");

    if (!mediaColumns.folder_id) {
      await queryInterface.addColumn("media", "folder_id", {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "media_folders", key: "id" },
        onDelete: "SET NULL",
      });
      await queryInterface.addIndex("media", ["folder_id"], { name: "ix_media_folder_id" });
    }

    if (!mediaColumns.alt_text) {
      await queryInterface.addColumn("media", "alt_text", { type: Sequelize.STRING(300), allowNull: true });
    }

    if (!mediaColumns.deleted_at) {
      await queryInterface.addColumn("media", "deleted_at", { type: Sequelize.DATE, allowNull: true });
      await queryInterface.addIndex("media", ["deleted_at"], { name: "ix_media_deleted_at" });
    }
  },

  async down(queryInterface) {
    const mediaColumns = await queryInterface.describeTable("media");
    if (mediaColumns.deleted_at) await queryInterface.removeColumn("media", "deleted_at");
    if (mediaColumns.alt_text) await queryInterface.removeColumn("media", "alt_text");
    if (mediaColumns.folder_id) await queryInterface.removeColumn("media", "folder_id");

    const tables = await queryInterface.showAllTables();
    if (tables.includes("media_folders")) await queryInterface.dropTable("media_folders");
  },
};
