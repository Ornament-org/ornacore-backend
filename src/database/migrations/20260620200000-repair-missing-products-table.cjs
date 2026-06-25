"use strict";

const timestamps = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
});

const id = (Sequelize) => ({
  type: Sequelize.BIGINT.UNSIGNED,
  autoIncrement: true,
  primaryKey: true,
  allowNull: false,
});

const foreignId = (Sequelize, model, { allowNull = false, onDelete = "RESTRICT" } = {}) => ({
  type: Sequelize.BIGINT.UNSIGNED,
  allowNull,
  references: { model, key: "id" },
  onUpdate: "CASCADE",
  onDelete,
});

const hasTable = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === "string" ? table : (table.tableName ?? Object.values(table)[0]);
    return name === tableName;
  });
};

const hasIndex = async (queryInterface, tableName, indexName) =>
  (await queryInterface.showIndex(tableName)).some((index) => index.name === indexName);

const addIndexIfMissing = async (queryInterface, tableName, fields, options) => {
  if (!(await hasIndex(queryInterface, tableName, options.name))) {
    await queryInterface.addIndex(tableName, fields, options);
  }
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, "products"))) {
      await queryInterface.createTable("products", {
        id: id(Sequelize),
        metal_id: foreignId(Sequelize, "metals"),
        design_code: { type: Sequelize.STRING(100), allowNull: false, unique: true },
        name: { type: Sequelize.STRING(191), allowNull: false },
        slug: { type: Sequelize.STRING(220), allowNull: false, unique: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        jewelry_attributes: { type: Sequelize.JSON, allowNull: true },
        status: {
          type: Sequelize.ENUM("DRAFT", "ACTIVE", "INACTIVE", "OUT_OF_STOCK", "ARCHIVED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        published_at: { type: Sequelize.DATE, allowNull: true },
        created_by_user_id: foreignId(Sequelize, "users"),
        updated_by_user_id: foreignId(Sequelize, "users", {
          allowNull: true,
          onDelete: "SET NULL",
        }),
        ...timestamps(Sequelize),
      });
    }

    await addIndexIfMissing(queryInterface, "products", ["metal_id", "status"], {
      name: "products_metal_status_idx",
    });
    await addIndexIfMissing(queryInterface, "products", ["name"], { name: "products_name_idx" });
  },

  async down() {
    // No-op: this migration repairs a required core table and should not drop product data.
  },
};
