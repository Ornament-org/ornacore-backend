"use strict";

const hasTable = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.map((t) => (typeof t === "string" ? t : t.tableName)).includes(tableName);
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, "shopkeeper_metal_credit_limits"))) return;
    const table = await queryInterface.describeTable("shopkeeper_metal_credit_limits");
    if (!table["advance_balance"]) {
      await queryInterface.addColumn("shopkeeper_metal_credit_limits", "advance_balance", {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: "0.000",
      });
    }
  },

  async down(queryInterface) {
    if (!(await hasTable(queryInterface, "shopkeeper_metal_credit_limits"))) return;
    const table = await queryInterface.describeTable("shopkeeper_metal_credit_limits");
    if (table["advance_balance"]) {
      await queryInterface.removeColumn("shopkeeper_metal_credit_limits", "advance_balance");
    }
  },
};
