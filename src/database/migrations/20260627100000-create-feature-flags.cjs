"use strict";

/** @param {import("sequelize").QueryInterface} queryInterface
 *  @param {import("sequelize").Sequelize} Sequelize */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("feature_flags", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      key: { type: Sequelize.STRING(200), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      environment: {
        type: Sequelize.ENUM("all", "web", "mobile", "server"),
        allowNull: false,
        defaultValue: "all",
      },
      target_audience: {
        type: Sequelize.ENUM("all", "admin", "shopkeeper"),
        allowNull: false,
        defaultValue: "all",
      },
      rollout_percentage: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 100,
      },
      metadata: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("feature_flag_audits", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      feature_flag_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      actor_user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      action: { type: Sequelize.STRING(50), allowNull: false },
      old_value: { type: Sequelize.JSON, allowNull: true },
      new_value: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("feature_flags", ["environment"]);
    await queryInterface.addIndex("feature_flags", ["is_enabled"]);
    await queryInterface.addIndex("feature_flag_audits", ["feature_flag_id", "created_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("feature_flag_audits");
    await queryInterface.dropTable("feature_flags");
  },
};
