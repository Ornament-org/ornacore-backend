"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("products");

    if (!table["gross_weight"]) {
      await queryInterface.addColumn("products", "gross_weight", {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        after: "description",
      });
    }
    if (!table["net_weight"]) {
      await queryInterface.addColumn("products", "net_weight", {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        after: "gross_weight",
      });
    }
    if (!table["making_type"]) {
      await queryInterface.addColumn("products", "making_type", {
        type: Sequelize.ENUM("FIXED", "PER_GRAM", "PERCENT"),
        allowNull: true,
        after: "net_weight",
      });
    }
    if (!table["making_value"]) {
      await queryInterface.addColumn("products", "making_value", {
        type: Sequelize.DECIMAL(18, 4),
        allowNull: true,
        defaultValue: null,
        after: "making_type",
      });
    }
    if (!table["default_tunch"]) {
      await queryInterface.addColumn("products", "default_tunch", {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        after: "making_value",
      });
    }
    if (!table["thumbnail"]) {
      await queryInterface.addColumn("products", "thumbnail", {
        type: Sequelize.STRING(500),
        allowNull: true,
        after: "default_tunch",
      });
    }
    if (!table["is_b2b_visible"]) {
      await queryInterface.addColumn("products", "is_b2b_visible", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        after: "thumbnail",
      });
    }
    if (!table["is_b2c_visible"]) {
      await queryInterface.addColumn("products", "is_b2c_visible", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        after: "is_b2b_visible",
      });
    }
  },

  async down(queryInterface) {
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
      const table = await queryInterface.describeTable("products");
      if (table[col]) await queryInterface.removeColumn("products", col);
    }
  },
};
