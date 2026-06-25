"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("refresh_tokens", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      token_family: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      replaced_by_token_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "refresh_tokens", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      ip_address: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("refresh_tokens", ["user_id", "revoked_at", "expires_at"], {
      name: "refresh_tokens_user_active_idx",
    });
    await queryInterface.addIndex("refresh_tokens", ["token_family"], {
      name: "refresh_tokens_family_idx",
    });

    await queryInterface.createTable("otp_challenges", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      purpose: {
        type: Sequelize.ENUM("REGISTRATION", "LOGIN", "PASSWORD_RESET", "CONTACT_VERIFICATION"),
        allowNull: false,
      },
      channel: {
        type: Sequelize.ENUM("EMAIL", "SMS"),
        allowNull: false,
      },
      destination: {
        type: Sequelize.STRING(191),
        allowNull: false,
      },
      code_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      attempts: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      consumed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("otp_challenges", ["destination", "purpose", "created_at"], {
      name: "otp_challenges_destination_purpose_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("otp_challenges");
    await queryInterface.dropTable("refresh_tokens");
  },
};
