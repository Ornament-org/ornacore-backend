"use strict";

const hasTable = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.map((table) => (typeof table === "string" ? table : table.tableName)).includes(tableName);
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, "khatabook_orders"))) return;
    const table = await queryInterface.describeTable("khatabook_orders");
    if (!table.cash_due_amount) {
      await queryInterface.addColumn("khatabook_orders", "cash_due_amount", {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: "0.0000",
      });
    }
  },

  async down(queryInterface) {
    if (!(await hasTable(queryInterface, "khatabook_orders"))) return;
    const table = await queryInterface.describeTable("khatabook_orders");
    if (table.cash_due_amount) {
      await queryInterface.removeColumn("khatabook_orders", "cash_due_amount");
    }
  },
};
