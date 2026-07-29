"use strict";

const columnName = "image_url_snapshot";

const hasColumn = async (queryInterface) => {
  const table = await queryInterface.describeTable("order_items");
  return Boolean(table[columnName]);
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (await hasColumn(queryInterface)) return;
    await queryInterface.addColumn("order_items", columnName, {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "sku_snapshot",
    });
  },

  async down(queryInterface) {
    if (!(await hasColumn(queryInterface))) return;
    await queryInterface.removeColumn("order_items", columnName);
  },
};
