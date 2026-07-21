"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Sections are live the moment they're saved — no more draft/publish/version-snapshot
    // workflow. Map existing PUBLISHED -> ACTIVE, DRAFT/ARCHIVED -> INACTIVE before
    // collapsing the status enum, so nothing that was actually live goes dark.
    await queryInterface.sequelize.query(
      "UPDATE homepage_configs SET status = 'PUBLISHED' WHERE is_published = true AND status <> 'PUBLISHED'",
    );

    await queryInterface.changeColumn("homepage_configs", "status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "ACTIVE",
    });
    await queryInterface.sequelize.query(
      "UPDATE homepage_configs SET status = CASE WHEN status = 'PUBLISHED' THEN 'ACTIVE' ELSE 'INACTIVE' END",
    );
    await queryInterface.changeColumn("homepage_configs", "status", {
      type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    });

    const columns = await queryInterface.describeTable("homepage_configs");
    if (columns.is_published) await queryInterface.removeColumn("homepage_configs", "is_published");
    if (columns.version) await queryInterface.removeColumn("homepage_configs", "version");

    const tables = await queryInterface.showAllTables();
    if (tables.includes("homepage_versions")) await queryInterface.dropTable("homepage_versions");
  },

  async down(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable("homepage_configs");
    if (!columns.version) {
      await queryInterface.addColumn("homepage_configs", "version", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      });
    }
    if (!columns.is_published) {
      await queryInterface.addColumn("homepage_configs", "is_published", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    await queryInterface.changeColumn("homepage_configs", "status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "DRAFT",
    });
    await queryInterface.sequelize.query(
      "UPDATE homepage_configs SET status = CASE WHEN status = 'ACTIVE' THEN 'PUBLISHED' ELSE 'DRAFT' END, is_published = (status = 'ACTIVE')",
    );
    await queryInterface.changeColumn("homepage_configs", "status", {
      type: Sequelize.ENUM("DRAFT", "PUBLISHED", "ARCHIVED"),
      allowNull: false,
      defaultValue: "DRAFT",
    });

    const tables = await queryInterface.showAllTables();
    if (!tables.includes("homepage_versions")) {
      await queryInterface.createTable("homepage_versions", {
        id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
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
};
