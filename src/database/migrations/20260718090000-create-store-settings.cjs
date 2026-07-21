"use strict";

// Additive-only: unlike the original system-data seeder, this migration must not touch
// role_permissions for codes it didn't add — it only grants the two new settings
// permissions to SUPER_ADMIN/ADMIN, leaving every other grant on those roles untouched.
const newPermissions = [
  ["Settings", "View", "settings.view", "View store/business settings"],
  ["Settings", "Manage", "settings.manage", "Update store/business settings"],
];

const grantedRoles = ["SUPER_ADMIN", "ADMIN"];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const tables = await queryInterface.showAllTables();

    if (!tables.includes("store_settings")) {
      await queryInterface.createTable("store_settings", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        business_name: { type: Sequelize.STRING(200), allowNull: true },
        display_name: { type: Sequelize.STRING(200), allowNull: true },
        logo: { type: Sequelize.TEXT, allowNull: true },
        favicon: { type: Sequelize.TEXT, allowNull: true },
        currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: "INR" },
        timezone: { type: Sequelize.STRING(50), allowNull: false, defaultValue: "Asia/Kolkata" },
        date_format: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "DD MMM YYYY" },
        updated_by_user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
    }

    for (const [module, action, code, description] of newPermissions) {
      await queryInterface.sequelize.query(
        `INSERT INTO permissions (code, module, action, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE module = VALUES(module), action = VALUES(action),
           description = VALUES(description), updated_at = VALUES(updated_at)`,
        { replacements: [code, module, action, description, now, now] },
      );
    }

    const [roleRows] = await queryInterface.sequelize.query(
      "SELECT id, code FROM roles WHERE code IN (?)",
      { replacements: [grantedRoles] },
    );
    const [permissionRows] = await queryInterface.sequelize.query(
      "SELECT id, code FROM permissions WHERE code IN (?)",
      { replacements: [newPermissions.map(([, , code]) => code)] },
    );

    for (const role of roleRows) {
      for (const permission of permissionRows) {
        await queryInterface.sequelize.query(
          `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
           SELECT ?, ?, ?, ?
           WHERE NOT EXISTS (
             SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?
           )`,
          {
            replacements: [role.id, permission.id, now, now, role.id, permission.id],
          },
        );
      }
    }
  },

  async down(queryInterface) {
    const codes = newPermissions.map(([, , code]) => code);
    const [permissionRows] = await queryInterface.sequelize.query(
      "SELECT id FROM permissions WHERE code IN (?)",
      { replacements: [codes] },
    );
    const permissionIds = permissionRows.map((row) => row.id);
    if (permissionIds.length) {
      await queryInterface.sequelize.query(
        "DELETE FROM role_permissions WHERE permission_id IN (?)",
        { replacements: [permissionIds] },
      );
    }
    await queryInterface.sequelize.query("DELETE FROM permissions WHERE code IN (?)", {
      replacements: [codes],
    });

    const tables = await queryInterface.showAllTables();
    if (tables.includes("store_settings")) {
      await queryInterface.dropTable("store_settings");
    }
  },
};
