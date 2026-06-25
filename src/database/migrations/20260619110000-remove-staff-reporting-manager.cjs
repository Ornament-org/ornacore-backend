"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeConstraint("staff_profiles", "staff_profiles_manager_fk");
    await queryInterface.removeColumn("staff_profiles", "reports_to_staff_id");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("staff_profiles", "reports_to_staff_id", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addConstraint("staff_profiles", {
      fields: ["reports_to_staff_id"],
      type: "foreign key",
      name: "staff_profiles_manager_fk",
      references: { table: "staff_profiles", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },
};
