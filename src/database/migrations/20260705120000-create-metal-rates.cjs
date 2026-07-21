"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("metal_rates")) return;

    await queryInterface.createTable("metal_rates", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      metal_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: "metals", key: "id" },
        onDelete: "RESTRICT",
      },
      rate_date: { type: Sequelize.DATEONLY, allowNull: false },
      base_price_per_gram: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      extra_per_gram: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      created_by_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("metal_rates", ["metal_id", "rate_date"], {
      unique: true,
      name: "uq_metal_rate_date",
    });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("metal_rates")) {
      await queryInterface.dropTable("metal_rates");
    }
  },
};
