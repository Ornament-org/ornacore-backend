"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("products", "design_code", {
      type: Sequelize.STRING(100),
      allowNull: true,
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("products", "design_code", {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
    });
  },
};
