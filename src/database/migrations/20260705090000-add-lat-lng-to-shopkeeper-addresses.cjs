"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("shopkeeper_addresses");

    if (!table["latitude"]) {
      await queryInterface.addColumn("shopkeeper_addresses", "latitude", {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
        after: "pincode",
      });
    }
    if (!table["longitude"]) {
      await queryInterface.addColumn("shopkeeper_addresses", "longitude", {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
        after: "latitude",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("shopkeeper_addresses");
    if (table["longitude"]) await queryInterface.removeColumn("shopkeeper_addresses", "longitude");
    if (table["latitude"]) await queryInterface.removeColumn("shopkeeper_addresses", "latitude");
  },
};
