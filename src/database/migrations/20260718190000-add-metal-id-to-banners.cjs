"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const bannersTable = await queryInterface.describeTable("banners");
    if (!bannersTable.metal_id) {
      await queryInterface.addColumn("banners", "metal_id", {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "metals", key: "id" },
        onDelete: "SET NULL",
      });
      await queryInterface.addIndex("banners", ["metal_id"], { name: "ix_banners_metal_id" });
    }
  },

  async down(queryInterface) {
    const bannersTable = await queryInterface.describeTable("banners");
    if (bannersTable.metal_id) {
      await queryInterface.removeColumn("banners", "metal_id");
    }
  },
};
