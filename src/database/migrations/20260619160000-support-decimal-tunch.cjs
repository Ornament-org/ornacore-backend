"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("product_variants", "tunch", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("product_variants", "tunch", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
  },
};
