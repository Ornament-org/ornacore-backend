"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ordersTable = await queryInterface.describeTable("orders");
    if (!ordersTable.fulfilled_by_khatabook_order_id) {
      await queryInterface.addColumn("orders", "fulfilled_by_khatabook_order_id", {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "khatabook_orders", key: "id" },
        onDelete: "SET NULL",
      });
      await queryInterface.addIndex("orders", ["fulfilled_by_khatabook_order_id"], {
        name: "ix_orders_fulfilled_by_khatabook_order_id",
      });
    }
  },

  async down(queryInterface) {
    const ordersTable = await queryInterface.describeTable("orders");
    if (ordersTable.fulfilled_by_khatabook_order_id) {
      await queryInterface.removeColumn("orders", "fulfilled_by_khatabook_order_id");
    }
  },
};
