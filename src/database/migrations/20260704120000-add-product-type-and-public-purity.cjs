"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const products = await queryInterface.describeTable("products");
    if (!products["product_type"]) {
      await queryInterface.addColumn("products", "product_type", {
        type: Sequelize.ENUM("SIMPLE", "VARIABLE"),
        allowNull: false,
        defaultValue: "SIMPLE",
        after: "status",
      });
    }

    const variants = await queryInterface.describeTable("product_variants");
    if (!variants["public_purity"]) {
      await queryInterface.addColumn("product_variants", "public_purity", {
        type: Sequelize.STRING(50),
        allowNull: true,
        after: "purity",
      });
    }
    if (!variants["public_karat"]) {
      await queryInterface.addColumn("product_variants", "public_karat", {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        after: "karat",
      });
    }
  },

  async down(queryInterface) {
    const variants = await queryInterface.describeTable("product_variants");
    if (variants["public_karat"]) await queryInterface.removeColumn("product_variants", "public_karat");
    if (variants["public_purity"]) await queryInterface.removeColumn("product_variants", "public_purity");

    const products = await queryInterface.describeTable("products");
    if (products["product_type"]) await queryInterface.removeColumn("products", "product_type");
  },
};
