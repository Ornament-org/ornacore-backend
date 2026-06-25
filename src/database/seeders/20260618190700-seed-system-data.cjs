"use strict";

const permissionCatalog = [
  ["Staff", "Create", "staff.create", "Create new staff account"],
  ["Staff", "View", "staff.view", "View staff list and details"],
  ["Staff", "Update", "staff.update", "Update staff account information"],
  ["Staff", "Delete", "staff.delete", "Delete staff accounts"],
  ["Role", "Manage", "role.manage", "Manage system roles"],
  ["Permission", "View", "permission.view", "View available permissions"],
  ["Permission", "Assign", "permission.assign", "Assign or remove permissions from roles"],
  ["Shopkeeper", "View", "shopkeeper.view", "View shopkeeper profiles and details"],
  ["Shopkeeper", "Create", "shopkeeper.create", "Create shopkeeper profiles"],
  ["Shopkeeper", "Update", "shopkeeper.update", "Update shopkeeper information"],
  ["Shopkeeper", "Delete", "shopkeeper.delete", "Delete shopkeeper profiles"],
  ["Shopkeeper", "Approve", "shopkeeper.approve", "Approve pending shopkeeper registrations"],
  ["Shopkeeper", "Reject", "shopkeeper.reject", "Reject shopkeeper registration requests"],
  ["Shopkeeper", "Suspend", "shopkeeper.suspend", "Suspend shopkeeper accounts temporarily"],
  ["Shopkeeper", "Block", "shopkeeper.block", "Block shopkeeper accounts permanently"],
  ["Shopkeeper", "Credit Limit Update", "shopkeeper.credit_limit.update", "Update shopkeeper credit limit"],
  ["Catalog", "Manage", "catalog.manage", "Manage product categories and catalog structure"],
  ["Media", "Manage", "media.manage", "Upload and manage media files"],
  ["Product", "Manage", "product.manage", "Create, update, and delete products"],
  ["Product", "View", "product.view", "View products"],
  ["Product", "Create", "product.create", "Create products"],
  ["Product", "Update", "product.update", "Update products"],
  ["Product", "Delete", "product.delete", "Delete products"],
  ["Pricing", "View", "pricing.view", "View pricing rules and price groups"],
  ["Pricing", "Update", "pricing.update", "Create and modify pricing rules and overrides"],
  ["Inventory", "View", "inventory.view", "View inventory levels and stock"],
  ["Inventory", "Update", "inventory.update", "Update inventory quantities and adjustments"],
  ["Order", "View", "order.view", "View orders and order details"],
  ["Order", "Update Status", "order.update_status", "Change order status"],
  ["Order", "Cancel", "order.cancel", "Cancel orders"],
  ["Payment", "View", "payment.view", "View payment transactions and history"],
  ["Payment", "Update Status", "payment.update_status", "Update payment status"],
  ["Delivery", "Manage", "delivery.manage", "Manage delivery schedules and logistics"],
  ["Ledger", "View", "ledger.view", "View khatabook ledger"],
  ["Ledger", "Export", "ledger.export", "Export ledger data"],
  ["Ledger", "Post", "ledger.post", "Create new ledger transactions"],
  ["Report", "View", "report.view", "Access business reports and analytics"],
  ["Report", "Export", "report.export", "Export reports"],
  ["Dashboard", "View", "dashboard.view", "View main dashboard with key metrics"],
  ["Audit", "View", "audit.view", "View audit logs and system activity"],
  ["Khatabook", "View", "khatabook.view", "View khatabook orders and balances"],
  ["Khatabook", "Create Order", "khatabook.order.create", "Create new khatabook order"],
  ["Khatabook", "Edit Order", "khatabook.order.edit", "Edit khatabook orders"],
  ["Khatabook", "Add Collection", "khatabook.collection.create", "Receive cash or metal payment"],
];

const permissions = permissionCatalog.map(([, , code]) => code);
const legacyPermissions = [
  "khatabook.create_order",
  "khatabook.edit_order",
  "khatabook.add_payment",
  "khatabook.credit_limit_override",
];

const roles = [
  {
    code: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full system access",
    permissions,
  },
  {
    code: "ADMIN",
    name: "Administrator",
    description: "Business operations administrator",
    permissions: permissions.filter(
      (code) => !["staff.delete", "permission.assign"].includes(code),
    ),
  },
  {
    code: "MANAGER",
    name: "Manager",
    description: "Daily operations manager",
    permissions: [
      "staff.view",
      "shopkeeper.view",
      "shopkeeper.update",
      "catalog.manage",
      "product.manage",
      "pricing.view",
      "inventory.view",
      "inventory.update",
      "order.view",
      "order.update_status",
      "khatabook.order.create",
      "khatabook.collection.create",
      "payment.view",
      "payment.update_status",
      "delivery.manage",
      "ledger.view",
      "report.view",
      "dashboard.view",
    ],
  },
  {
    code: "STAFF",
    name: "Staff",
    description: "Internal staff access",
    permissions: [
      "dashboard.view",
      "shopkeeper.view",
      "khatabook.view",
      "khatabook.order.create",
      "khatabook.collection.create",
      "ledger.view",
      "product.view",
      "pricing.view",
      "inventory.view",
      "payment.view",
      "report.view",
    ],
  },
];

const metals = [
  ["GOLD", "Gold", 1],
  ["SILVER", "Silver", 2],
  ["DIAMOND", "Diamond", 3],
  ["PLATINUM", "Platinum", 4],
];

const priceGroups = [
  ["NORMAL_RETAILER", "Normal Retailer"],
  ["PREMIUM_RETAILER", "Premium Retailer"],
  ["HIGH_VOLUME_BUYER", "High Volume Buyer"],
  ["SPECIAL_PARTNER", "Special Partner"],
];

const ledgerAccounts = [
  ["CASH", "Cash", "ASSET"],
  ["BANK", "Bank", "ASSET"],
  ["ACCOUNTS_RECEIVABLE", "Accounts Receivable", "ASSET"],
  ["SALES_REVENUE", "Jewelry Sales Revenue", "REVENUE"],
  ["PAYMENT_ADJUSTMENTS", "Payment Adjustments", "EXPENSE"],
];

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const [module, action, code, description] of permissionCatalog) {
      await queryInterface.sequelize.query(
        `INSERT INTO permissions (code, module, action, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE module = VALUES(module), action = VALUES(action),
           description = VALUES(description), updated_at = VALUES(updated_at)`,
        {
          replacements: [code, module, action, description, now, now],
        },
      );
    }

    await queryInterface.sequelize.query("DELETE FROM permissions WHERE code IN (?)", {
      replacements: [legacyPermissions],
    });

    for (const role of roles) {
      await queryInterface.sequelize.query(
        `INSERT INTO roles (code, name, description, is_system, is_active, created_at, updated_at)
         VALUES (?, ?, ?, true, true, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description),
           is_active = true, updated_at = VALUES(updated_at)`,
        { replacements: [role.code, role.name, role.description, now, now] },
      );

      const [[roleRow]] = await queryInterface.sequelize.query(
        "SELECT id FROM roles WHERE code = ? LIMIT 1",
        { replacements: [role.code] },
      );

      // Delete all existing role permissions before re-adding
      await queryInterface.sequelize.query(
        "DELETE FROM role_permissions WHERE role_id = ?",
        { replacements: [roleRow.id] },
      );

      for (const permissionCode of role.permissions) {
        const [[permissionRow]] = await queryInterface.sequelize.query(
          "SELECT id FROM permissions WHERE code = ? LIMIT 1",
          { replacements: [permissionCode] },
        );
        await queryInterface.sequelize.query(
          `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
          { replacements: [roleRow.id, permissionRow.id, now, now] },
        );
      }
    }

    await queryInterface.sequelize.query("UPDATE roles SET is_active = false WHERE code NOT IN (?)", {
      replacements: [roles.map((role) => role.code)],
    });

    for (const [code, name, displayOrder] of metals) {
      await queryInterface.sequelize.query(
        `INSERT INTO metals (code, name, description, is_active, display_order, created_at, updated_at)
         VALUES (?, ?, ?, true, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = true,
           display_order = VALUES(display_order), updated_at = VALUES(updated_at)`,
        {
          replacements: [code, name, `${name} jewelry`, displayOrder, now, now],
        },
      );
    }

    for (const [code, name] of priceGroups) {
      await queryInterface.sequelize.query(
        `INSERT INTO price_groups (code, name, description, is_active, created_at, updated_at)
         VALUES (?, ?, ?, true, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = true,
           updated_at = VALUES(updated_at)`,
        {
          replacements: [code, name, `${name} pricing group`, now, now],
        },
      );
    }

    for (const [code, name, accountType] of ledgerAccounts) {
      await queryInterface.sequelize.query(
        `INSERT INTO ledger_accounts
          (code, name, account_type, owner_type, shopkeeper_id, parent_account_id,
           currency, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 'SYSTEM', NULL, NULL, 'INR', true, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), account_type = VALUES(account_type),
           is_active = true, updated_at = VALUES(updated_at)`,
        { replacements: [code, name, accountType, now, now] },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("role_permissions", null, {});
    await queryInterface.bulkDelete("permissions", { code: permissions }, {});
    await queryInterface.bulkDelete("roles", { code: roles.map((role) => role.code) }, {});
    await queryInterface.bulkDelete("metals", { code: metals.map(([code]) => code) }, {});
    await queryInterface.bulkDelete(
      "price_groups",
      { code: priceGroups.map(([code]) => code) },
      {},
    );
    await queryInterface.bulkDelete(
      "ledger_accounts",
      { code: ledgerAccounts.map(([code]) => code) },
      {},
    );
  },
};
