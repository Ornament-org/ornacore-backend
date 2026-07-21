"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const products = await queryInterface.describeTable("products");
    for (const col of [
      "gross_weight",
      "net_weight",
      "making_type",
      "making_value",
      "default_tunch",
      "thumbnail",
      "is_b2b_visible",
      "is_b2c_visible",
    ]) {
      if (products[col]) await queryInterface.removeColumn("products", col);
    }

    const variants = await queryInterface.describeTable("product_variants");
    for (const col of ["gross_weight", "net_weight"]) {
      if (variants[col]) await queryInterface.removeColumn("product_variants", col);
    }
  },

  async down(queryInterface, Sequelize) {
    const products = await queryInterface.describeTable("products");
    if (!products["gross_weight"]) {
      await queryInterface.addColumn("products", "gross_weight", {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        after: "description",
      });
    }
    if (!products["net_weight"]) {
      await queryInterface.addColumn("products", "net_weight", {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        after: "gross_weight",
      });
    }
    if (!products["making_type"]) {
      await queryInterface.addColumn("products", "making_type", {
        type: Sequelize.ENUM("FIXED", "PER_GRAM", "PERCENT"),
        allowNull: true,
        after: "net_weight",
      });
    }
    if (!products["making_value"]) {
      await queryInterface.addColumn("products", "making_value", {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: true,
        after: "making_type",
      });
    }
    if (!products["default_tunch"]) {
      await queryInterface.addColumn("products", "default_tunch", {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        after: "making_value",
      });
    }
    if (!products["thumbnail"]) {
      await queryInterface.addColumn("products", "thumbnail", {
        type: Sequelize.STRING(500),
        allowNull: true,
        after: "default_tunch",
      });
    }
    if (!products["is_b2b_visible"]) {
      await queryInterface.addColumn("products", "is_b2b_visible", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        after: "thumbnail",
      });
    }
    if (!products["is_b2c_visible"]) {
      await queryInterface.addColumn("products", "is_b2c_visible", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        after: "is_b2b_visible",
      });
    }

    const variants = await queryInterface.describeTable("product_variants");
    if (!variants["gross_weight"]) {
      await queryInterface.addColumn("product_variants", "gross_weight", {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        after: "weight_grams",
      });
    }
    if (!variants["net_weight"]) {
      await queryInterface.addColumn("product_variants", "net_weight", {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        after: "gross_weight",
      });
    }
  },
};
