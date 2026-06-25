"use strict";

const tableName = "shopkeeper_metal_credit_limits";

const foreignId = (Sequelize, table, options = {}) => ({
  type: Sequelize.BIGINT.UNSIGNED,
  allowNull: options.allowNull ?? false,
  references: { model: table, key: "id" },
  onUpdate: "CASCADE",
  onDelete: options.onDelete ?? "CASCADE",
});

const removePriceGroupColumn = async (queryInterface) => {
  const table = await queryInterface.describeTable("shopkeeper_profiles");
  if (!table.price_group_id) return;
  try {
    await queryInterface.removeConstraint(
      "shopkeeper_profiles",
      "shopkeeper_profiles_price_group_fk",
    );
  } catch {
    // Older local DBs may not have the named FK. Removing the column still clears the field.
  }
  await queryInterface.removeColumn("shopkeeper_profiles", "price_group_id");
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes(tableName)) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles"),
        metal_id: foreignId(Sequelize, "metals", { onDelete: "CASCADE" }),
        credit_limit_grams: {
          type: Sequelize.DECIMAL(14, 3),
          allowNull: false,
          defaultValue: "0.000",
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      });
      await queryInterface.addIndex(tableName, ["shopkeeper_id", "metal_id"], {
        unique: true,
        name: "shopkeeper_metal_credit_limits_unique_idx",
      });
      await queryInterface.addIndex(tableName, ["metal_id"], {
        name: "shopkeeper_metal_credit_limits_metal_idx",
      });
    }

    await removePriceGroupColumn(queryInterface);
  },

  async down(queryInterface, Sequelize) {
    const profileTable = await queryInterface.describeTable("shopkeeper_profiles");
    if (!profileTable.price_group_id) {
      await queryInterface.addColumn("shopkeeper_profiles", "price_group_id", {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "price_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
    await queryInterface.dropTable(tableName);
  },
};
