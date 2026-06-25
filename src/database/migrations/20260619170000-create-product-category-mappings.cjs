"use strict";

const hasTable = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === "string" ? table : (table.tableName ?? Object.values(table)[0]);
    return name === tableName;
  });
};

const hasIndex = async (queryInterface, tableName, indexName) =>
  (await queryInterface.showIndex(tableName)).some((index) => index.name === indexName);

const dropForeignKeysForColumn = async (queryInterface, tableName, columnName) => {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME AS constraintName
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [tableName, columnName] },
  );

  for (const { constraintName } of constraints) {
    await queryInterface.removeConstraint(tableName, constraintName);
  }
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, "product_category_mappings"))) {
      await queryInterface.createTable("product_category_mappings", {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        product_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        category_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "categories", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
    }

    if (!(await hasIndex(queryInterface, "product_category_mappings", "product_category_uq"))) {
      await queryInterface.addIndex("product_category_mappings", ["product_id", "category_id"], {
        unique: true,
        name: "product_category_uq",
      });
    }
    if (!(await hasIndex(queryInterface, "product_category_mappings", "category_products_idx"))) {
      await queryInterface.addIndex("product_category_mappings", ["category_id"], {
        name: "category_products_idx",
      });
    }
    if (
      !(await hasIndex(queryInterface, "product_category_mappings", "product_primary_category_idx"))
    ) {
      await queryInterface.addIndex("product_category_mappings", ["product_id", "is_primary"], {
        name: "product_primary_category_idx",
      });
    }

    const mappingColumns = await queryInterface.describeTable("product_category_mappings");
    if (!mappingColumns.primary_product_id) {
      await queryInterface.addColumn("product_category_mappings", "primary_product_id", {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
    }
    if (
      !(await hasIndex(
        queryInterface,
        "product_category_mappings",
        "one_primary_category_per_product_uq",
      ))
    ) {
      await queryInterface.addIndex("product_category_mappings", ["primary_product_id"], {
        unique: true,
        name: "one_primary_category_per_product_uq",
      });
    }

    const productColumns = await queryInterface.describeTable("products");
    if (productColumns.category_id) {
      await queryInterface.sequelize.query(
        `INSERT INTO product_category_mappings
          (product_id, category_id, is_primary, primary_product_id, sort_order, created_at, updated_at)
         SELECT id, category_id, true, id, 0, created_at, updated_at
         FROM products
         WHERE category_id IS NOT NULL
         ON DUPLICATE KEY UPDATE
           is_primary = true,
           primary_product_id = VALUES(primary_product_id),
           sort_order = 0,
           updated_at = VALUES(updated_at)`,
      );

      await dropForeignKeysForColumn(queryInterface, "products", "category_id");
      if (await hasIndex(queryInterface, "products", "products_taxonomy_status_idx")) {
        await queryInterface.removeIndex("products", "products_taxonomy_status_idx");
      }
      await queryInterface.removeColumn("products", "category_id");
    }

    if (!(await hasIndex(queryInterface, "products", "products_metal_status_idx"))) {
      await queryInterface.addIndex("products", ["metal_id", "status"], {
        name: "products_metal_status_idx",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const productColumns = await queryInterface.describeTable("products");
    if (!productColumns.category_id) {
      await queryInterface.addColumn("products", "category_id", {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(
      `UPDATE products p
       INNER JOIN product_category_mappings pcm
         ON pcm.product_id = p.id AND pcm.is_primary = true
       SET p.category_id = pcm.category_id`,
    );

    const [[missing]] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM products WHERE category_id IS NULL",
    );
    if (Number(missing.count) > 0) {
      throw new Error(
        "Cannot restore products.category_id because some products lack a primary category",
      );
    }

    await queryInterface.changeColumn("products", "category_id", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: "categories", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
    if (await hasIndex(queryInterface, "products", "products_metal_status_idx")) {
      await queryInterface.removeIndex("products", "products_metal_status_idx");
    }
    await queryInterface.addIndex("products", ["metal_id", "category_id", "status"], {
      name: "products_taxonomy_status_idx",
    });
    await queryInterface.dropTable("product_category_mappings");
  },
};
