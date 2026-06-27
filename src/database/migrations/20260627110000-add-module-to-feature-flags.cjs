"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("feature_flags");
    if (!table["module"]) {
      await queryInterface.addColumn("feature_flags", "module", {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null,
        after: "key",
      });
      await queryInterface.addIndex("feature_flags", ["module"]);
    }
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("feature_flags", "module");
  },
};
