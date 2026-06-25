"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable("product_variants");
    if (!columns.tunch) {
      await queryInterface.addColumn("product_variants", "tunch", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        after: "karat",
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable("product_variants");
    if (columns.tunch) await queryInterface.removeColumn("product_variants", "tunch");
  },
};
