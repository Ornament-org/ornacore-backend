"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("metals");
    if (!table["rate_unit"]) {
      await queryInterface.addColumn("metals", "rate_unit", {
        type: Sequelize.ENUM("PER_10G", "PER_KG", "PER_G"),
        allowNull: false,
        defaultValue: "PER_10G",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("metals");
    if (table["rate_unit"]) {
      await queryInterface.removeColumn("metals", "rate_unit");
    }
  },
};
