"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("shopkeeper_profiles", "latitude", {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
      after: "pincode",
    });
    await queryInterface.addColumn("shopkeeper_profiles", "longitude", {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
      after: "latitude",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("shopkeeper_profiles", "longitude");
    await queryInterface.removeColumn("shopkeeper_profiles", "latitude");
  },
};
