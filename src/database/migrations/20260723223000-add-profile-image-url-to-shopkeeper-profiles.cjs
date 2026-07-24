"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("shopkeeper_profiles");
    if (!table.profile_image_url) {
      await queryInterface.addColumn("shopkeeper_profiles", "profile_image_url", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("shopkeeper_profiles");
    if (table.profile_image_url) {
      await queryInterface.removeColumn("shopkeeper_profiles", "profile_image_url");
    }
  },
};
