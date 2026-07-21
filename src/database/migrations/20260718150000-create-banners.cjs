"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes("banner_placeholders")) {
      await queryInterface.createTable("banner_placeholders", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        name: { type: Sequelize.STRING(150), allowNull: false },
        key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
        description: { type: Sequelize.STRING(500), allowNull: true },
        status: {
          type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
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

      await queryInterface.addIndex("banner_placeholders", ["status"], {
        name: "ix_banner_placeholders_status",
      });
    }

    if (!tables.includes("banners")) {
      await queryInterface.createTable("banners", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        title: { type: Sequelize.STRING(200), allowNull: false },
        subtitle: { type: Sequelize.STRING(300), allowNull: true },
        placement_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "banner_placeholders", key: "id" },
          onDelete: "RESTRICT",
        },
        image_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "media", key: "id" },
          onDelete: "RESTRICT",
        },
        mobile_image_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: "media", key: "id" },
          onDelete: "SET NULL",
        },
        link_url: { type: Sequelize.STRING(500), allowNull: true },
        sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        status: {
          type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        starts_at: { type: Sequelize.DATE, allowNull: true },
        ends_at: { type: Sequelize.DATE, allowNull: true },
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

      await queryInterface.addIndex("banners", ["placement_id"], { name: "ix_banners_placement_id" });
      await queryInterface.addIndex("banners", ["status"], { name: "ix_banners_status" });
      await queryInterface.addIndex("banners", ["sort_order"], { name: "ix_banners_sort_order" });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("banners")) await queryInterface.dropTable("banners");
    if (tables.includes("banner_placeholders")) await queryInterface.dropTable("banner_placeholders");
  },
};
