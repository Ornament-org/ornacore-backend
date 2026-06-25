"use strict";

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  const columns = await queryInterface.describeTable(tableName);
  if (!columns[columnName]) await queryInterface.addColumn(tableName, columnName, definition);
};

const addConstraintIfMissing = async (queryInterface, tableName, definition) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME AS constraintName
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?`,
    { replacements: [tableName, definition.name] },
  );
  if (!rows.length) await queryInterface.addConstraint(tableName, definition);
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
    await addColumnIfMissing(queryInterface, "categories", "metal_id", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
    });

    await addConstraintIfMissing(queryInterface, "categories", {
      fields: ["metal_id"],
      type: "foreign key",
      name: "categories_metal_fk",
      references: { table: "metals", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await addIndexIfMissing(queryInterface, "categories", ["metal_id"], {
      name: "categories_metal_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint("categories", "categories_metal_fk");
    await queryInterface.removeIndex("categories", "categories_metal_idx");
    await queryInterface.removeColumn("categories", "metal_id");
  },
};
