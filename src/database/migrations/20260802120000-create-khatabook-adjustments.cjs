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
  return tables.map((table) => (typeof table === "string" ? table : table.tableName)).includes(tableName);
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, "khatabook_adjustments"))) {
      await queryInterface.createTable("khatabook_adjustments", {
        id: id(Sequelize),
        shopkeeper_id: foreignId(Sequelize, "shopkeeper_profiles"),
        metal_id: foreignId(Sequelize, "metals"),
        adjustment_type: {
          type: Sequelize.ENUM("METAL_DUE", "CASH_DUE"),
          allowNull: false,
        },
        due_quantity: {
          type: Sequelize.DECIMAL(14, 3),
          allowNull: false,
          defaultValue: "0.000",
        },
        cash_amount: {
          type: Sequelize.DECIMAL(18, 4),
          allowNull: false,
          defaultValue: "0.0000",
        },
        adjustment_date: { type: Sequelize.DATE, allowNull: false },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_by_user_id: foreignId(Sequelize, "users", { allowNull: true, onDelete: "SET NULL" }),
        ...timestamps(Sequelize),
      });
      await queryInterface.addIndex(
        "khatabook_adjustments",
        ["shopkeeper_id", "metal_id", "adjustment_date"],
        { name: "khatabook_adjustments_shop_metal_date_idx" },
      );
      await queryInterface.addIndex("khatabook_adjustments", ["adjustment_type"], {
        name: "khatabook_adjustments_type_idx",
      });
    }

    if (!(await hasTable(queryInterface, "khatabook_orders"))) return;

    await queryInterface.sequelize.query(`
      INSERT INTO khatabook_adjustments (
        shopkeeper_id,
        metal_id,
        adjustment_type,
        due_quantity,
        cash_amount,
        adjustment_date,
        notes,
        created_by_user_id,
        created_at,
        updated_at
      )
      SELECT
        shopkeeper_id,
        metal_id,
        CASE
          WHEN order_number LIKE 'MDUE-%' THEN 'METAL_DUE'
          ELSE 'CASH_DUE'
        END,
        CASE
          WHEN order_number LIKE 'MDUE-%' THEN fine_delivered
          ELSE 0
        END,
        CASE
          WHEN order_number LIKE 'CDUE-%' THEN cash_due_amount
          ELSE 0
        END,
        entry_date,
        notes,
        created_by_user_id,
        created_at,
        updated_at
      FROM khatabook_orders
      WHERE
        (
          order_number LIKE 'MDUE-%'
          AND COALESCE(fine_delivered, 0) > 0
        )
        OR
        (
          order_number LIKE 'CDUE-%'
          AND COALESCE(cash_due_amount, 0) > 0
        )
    `);

    await queryInterface.sequelize.query(`
      DELETE FROM khatabook_orders
      WHERE order_number LIKE 'MDUE-%' OR order_number LIKE 'CDUE-%'
    `);
  },

  async down(queryInterface) {
    if (await hasTable(queryInterface, "khatabook_adjustments")) {
      await queryInterface.dropTable("khatabook_adjustments");
    }
  },
};
