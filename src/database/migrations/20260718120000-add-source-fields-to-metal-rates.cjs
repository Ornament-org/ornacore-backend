"use strict";

const findCreatedByConstraint = async (queryInterface) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'metal_rates'
        AND COLUMN_NAME = 'created_by_user_id'
        AND REFERENCED_TABLE_NAME = 'users'
      LIMIT 1`,
  );

  return rows[0]?.CONSTRAINT_NAME ?? null;
};

const removeCreatedByConstraint = async (queryInterface) => {
  const constraintName = await findCreatedByConstraint(queryInterface);
  if (constraintName) {
    await queryInterface.removeConstraint("metal_rates", constraintName);
  }
};

const addCreatedByConstraint = async (queryInterface, onDelete) => {
  await queryInterface.addConstraint("metal_rates", {
    fields: ["created_by_user_id"],
    type: "foreign key",
    name: "fk_metal_rates_created_by_user_id",
    references: { table: "users", field: "id" },
    onDelete,
    onUpdate: "CASCADE",
  });
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("metal_rates");

    if (table.created_by_user_id?.allowNull === false) {
      await removeCreatedByConstraint(queryInterface);
      await queryInterface.changeColumn("metal_rates", "created_by_user_id", {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
      await addCreatedByConstraint(queryInterface, "SET NULL");
    }

    if (!table.source_name) {
      await queryInterface.addColumn("metal_rates", "source_name", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!table.source_location) {
      await queryInterface.addColumn("metal_rates", "source_location", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!table.source_url) {
      await queryInterface.addColumn("metal_rates", "source_url", {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }

    if (!table.source_synced_at) {
      await queryInterface.addColumn("metal_rates", "source_synced_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!table.source_raw_update) {
      await queryInterface.addColumn("metal_rates", "source_raw_update", {
        type: Sequelize.STRING(200),
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("metal_rates");

    for (const column of [
      "source_raw_update",
      "source_synced_at",
      "source_url",
      "source_location",
      "source_name",
    ]) {
      if (table[column]) await queryInterface.removeColumn("metal_rates", column);
    }

    if (table.created_by_user_id) {
      await removeCreatedByConstraint(queryInterface);
      await queryInterface.changeColumn("metal_rates", "created_by_user_id", {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      });
      await addCreatedByConstraint(queryInterface, "RESTRICT");
    }
  },
};
