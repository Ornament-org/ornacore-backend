"use strict";

const quantity = (Sequelize, { defaultValue = "0.000" } = {}) => ({
  type: Sequelize.DECIMAL(14, 3),
  allowNull: false,
  defaultValue,
});

const hasTable = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.map((table) => (typeof table === "string" ? table : table.tableName)).includes(tableName);
};

const addColumnIfMissing = async (queryInterface, Sequelize, tableName, columnName, definition) => {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition(Sequelize));
  }
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, "khatabook_orders"))) return;

    await addColumnIfMissing(queryInterface, Sequelize, "khatabook_orders", "credit_limit", quantity);
    await addColumnIfMissing(queryInterface, Sequelize, "khatabook_orders", "attempted_due", quantity);
    await addColumnIfMissing(queryInterface, Sequelize, "khatabook_orders", "exceeded_by", quantity);
    await addColumnIfMissing(
      queryInterface,
      Sequelize,
      "khatabook_orders",
      "is_credit_limit_override",
      (S) => ({ type: S.BOOLEAN, allowNull: false, defaultValue: false }),
    );

    if (await hasTable(queryInterface, "khatabook_collections")) {
      const collections = await queryInterface.describeTable("khatabook_collections");
      if (collections.source_order_id?.allowNull === false) {
        // Drop existing foreign key constraint if it exists
        try {
          await queryInterface.removeConstraint("khatabook_collections", "khatabook_collections_ibfk_5");
        } catch (e) {
          // Constraint might not exist or have different name, ignore error
        }
        
        // Change column to nullable
        await queryInterface.changeColumn("khatabook_collections", "source_order_id", {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
        });
        
        // Re-add the foreign key constraint
        await queryInterface.addConstraint("khatabook_collections", {
          fields: ["source_order_id"],
          type: "foreign key",
          name: "khatabook_collections_source_order_id_foreign",
          references: { model: "khatabook_orders", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        });
      }
    }
  },

  async down(queryInterface) {
    if (!(await hasTable(queryInterface, "khatabook_orders"))) return;
    const table = await queryInterface.describeTable("khatabook_orders");
    for (const columnName of [
      "is_credit_limit_override",
      "exceeded_by",
      "attempted_due",
      "credit_limit",
    ]) {
      if (table[columnName]) await queryInterface.removeColumn("khatabook_orders", columnName);
    }
  },
};
