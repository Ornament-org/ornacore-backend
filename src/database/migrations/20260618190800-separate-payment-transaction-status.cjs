"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("payments", "status", {
      type: Sequelize.STRING(32),
      allowNull: false,
    });
    await queryInterface.sequelize.query(
      "UPDATE payments SET status = CASE status WHEN 'PAID' THEN 'COMPLETED' WHEN 'UNPAID' THEN 'PENDING' WHEN 'PARTIALLY_PAID' THEN 'PENDING' WHEN 'CREDIT' THEN 'COMPLETED' ELSE status END",
    );
    await queryInterface.changeColumn("payments", "status", {
      type: Sequelize.ENUM("PENDING", "COMPLETED", "FAILED", "REFUNDED", "VOIDED"),
      allowNull: false,
      defaultValue: "COMPLETED",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("payments", "status", {
      type: Sequelize.STRING(32),
      allowNull: false,
    });
    await queryInterface.sequelize.query(
      "UPDATE payments SET status = CASE status WHEN 'COMPLETED' THEN 'PAID' WHEN 'PENDING' THEN 'UNPAID' WHEN 'FAILED' THEN 'UNPAID' WHEN 'VOIDED' THEN 'UNPAID' ELSE status END",
    );
    await queryInterface.changeColumn("payments", "status", {
      type: Sequelize.ENUM("UNPAID", "PARTIALLY_PAID", "PAID", "CREDIT", "REFUNDED"),
      allowNull: false,
    });
  },
};
