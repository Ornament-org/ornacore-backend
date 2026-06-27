"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("product_variants");

    if (!table["gross_weight"]) {
      await queryInterface.addColumn("product_variants", "gross_weight", {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        after: "weight_grams",
      });
    }
    if (!table["net_weight"]) {
      await queryInterface.addColumn("product_variants", "net_weight", {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        after: "gross_weight",
      });
    }
    if (!table["is_default"]) {
      await queryInterface.addColumn("product_variants", "is_default", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: "is_active",
      });
    }
  },

  async down(queryInterface) {
    for (const col of ["gross_weight", "net_weight", "is_default"]) {
      const table = await queryInterface.describeTable("product_variants");
      if (table[col]) await queryInterface.removeColumn("product_variants", col);
    }
  },
};
