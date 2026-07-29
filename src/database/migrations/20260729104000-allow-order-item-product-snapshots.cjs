"use strict";

const findForeignKeys = async (queryInterface, tableName, columnName) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :tableName
        AND COLUMN_NAME = :columnName
        AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: { tableName, columnName } },
  );
  return rows.map((row) => row.CONSTRAINT_NAME);
};

const dropForeignKeys = async (queryInterface, tableName, columnName) => {
  const constraints = await findForeignKeys(queryInterface, tableName, columnName);
  for (const constraintName of constraints) {
    await queryInterface.removeConstraint(tableName, constraintName);
  }
};

const changeOrderItemProductColumns = async (queryInterface, Sequelize, allowNull) => {
  await queryInterface.changeColumn("order_items", "product_id", {
    type: Sequelize.BIGINT.UNSIGNED,
    allowNull,
  });
  await queryInterface.changeColumn("order_items", "product_variant_id", {
    type: Sequelize.BIGINT.UNSIGNED,
    allowNull,
  });
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await dropForeignKeys(queryInterface, "order_items", "product_id");
    await dropForeignKeys(queryInterface, "order_items", "product_variant_id");

    await changeOrderItemProductColumns(queryInterface, Sequelize, true);

    await queryInterface.addConstraint("order_items", {
      fields: ["product_id"],
      type: "foreign key",
      name: "order_items_product_id_snapshot_fk",
      references: { table: "products", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addConstraint("order_items", {
      fields: ["product_variant_id"],
      type: "foreign key",
      name: "order_items_product_variant_id_snapshot_fk",
      references: { table: "product_variants", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await dropForeignKeys(queryInterface, "order_items", "product_id");
    await dropForeignKeys(queryInterface, "order_items", "product_variant_id");

    await changeOrderItemProductColumns(queryInterface, Sequelize, true);

    await queryInterface.addConstraint("order_items", {
      fields: ["product_id"],
      type: "foreign key",
      name: "order_items_product_id_foreign",
      references: { table: "products", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
    await queryInterface.addConstraint("order_items", {
      fields: ["product_variant_id"],
      type: "foreign key",
      name: "order_items_product_variant_id_foreign",
      references: { table: "product_variants", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
  },
};
