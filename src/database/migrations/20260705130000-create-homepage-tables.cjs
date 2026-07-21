"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes("homepage_configs")) {
      await queryInterface.createTable("homepage_configs", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        homepage_key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
        audience_type: {
          type: Sequelize.ENUM("B2B", "B2C", "GLOBAL"),
          allowNull: false,
        },
        metal_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: "metals", key: "id" },
          onDelete: "SET NULL",
        },
        title: { type: Sequelize.STRING(200), allowNull: false },
        version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        is_published: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        status: {
          type: Sequelize.ENUM("DRAFT", "PUBLISHED", "ARCHIVED"),
          allowNull: false,
          defaultValue: "DRAFT",
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

      await queryInterface.addIndex(
        "homepage_configs",
        ["audience_type", "metal_id", "is_published"],
        { name: "ix_homepage_resolution" },
      );
    }

    if (!tables.includes("homepage_sections")) {
      await queryInterface.createTable("homepage_sections", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        homepage_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "homepage_configs", key: "id" },
          onDelete: "CASCADE",
        },
        section_type: { type: Sequelize.STRING(50), allowNull: false },
        section_key: { type: Sequelize.STRING(100), allowNull: false },
        title: { type: Sequelize.STRING(200), allowNull: true },
        subtitle: { type: Sequelize.STRING(300), allowNull: true },
        config_json: { type: Sequelize.JSON, allowNull: true },
        sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });

      await queryInterface.addIndex("homepage_sections", ["homepage_id", "section_key"], {
        unique: true,
        name: "uq_homepage_section_key",
      });
      await queryInterface.addIndex("homepage_sections", ["homepage_id", "sort_order"], {
        name: "ix_homepage_section_order",
      });
    }

    if (!tables.includes("homepage_versions")) {
      await queryInterface.createTable("homepage_versions", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        homepage_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "homepage_configs", key: "id" },
          onDelete: "CASCADE",
        },
        version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "PUBLISHED" },
        snapshot_json: { type: Sequelize.JSON, allowNull: false },
        published_by_user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });

      await queryInterface.addIndex("homepage_versions", ["homepage_id", "version"], {
        unique: true,
        name: "uq_homepage_version",
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("homepage_versions")) {
      await queryInterface.dropTable("homepage_versions");
    }
    if (tables.includes("homepage_sections")) {
      await queryInterface.dropTable("homepage_sections");
    }
    if (tables.includes("homepage_configs")) {
      await queryInterface.dropTable("homepage_configs");
    }
  },
};
