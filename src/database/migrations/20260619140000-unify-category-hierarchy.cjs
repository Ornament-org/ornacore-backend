"use strict";

const hasTable = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === "string" ? table : (table.tableName ?? Object.values(table)[0]);
    return name === tableName;
  });
};

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  const columns = await queryInterface.describeTable(tableName);
  if (!columns[columnName]) await queryInterface.addColumn(tableName, columnName, definition);
};

const removeColumnIfPresent = async (queryInterface, tableName, columnName) => {
  const columns = await queryInterface.describeTable(tableName);
  if (columns[columnName]) await queryInterface.removeColumn(tableName, columnName);
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

const hasIndex = async (queryInterface, tableName, indexName) =>
  (await queryInterface.showIndex(tableName)).some((index) => index.name === indexName);

const addIndexIfMissing = async (queryInterface, tableName, fields, options) => {
  if (!(await hasIndex(queryInterface, tableName, options.name))) {
    await queryInterface.addIndex(tableName, fields, options);
  }
};

const removeIndexIfPresent = async (queryInterface, tableName, indexName) => {
  if (await hasIndex(queryInterface, tableName, indexName)) {
    await queryInterface.removeIndex(tableName, indexName);
  }
};

const uniqueCategorySlug = async (queryInterface, slug, legacyId) => {
  const [existing] = await queryInterface.sequelize.query(
    "SELECT id FROM categories WHERE slug = ? LIMIT 1",
    { replacements: [slug] },
  );
  return existing.length ? `${slug.slice(0, 165)}-${legacyId}` : slug;
};

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const initialColumns = await queryInterface.describeTable("categories");
    if (/varchar\(120\)/i.test(initialColumns.name.type)) {
      await queryInterface.changeColumn("categories", "name", {
        type: Sequelize.STRING(150),
        allowNull: false,
      });
    }
    if (/varchar\(150\)/i.test(initialColumns.slug.type)) {
      await queryInterface.changeColumn("categories", "slug", {
        type: Sequelize.STRING(180),
        allowNull: false,
      });
    }

    await addColumnIfMissing(queryInterface, "categories", "parent_id", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "categories", "short_description", {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "categories", "status", {
      type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    });
    await addColumnIfMissing(queryInterface, "categories", "meta_title", {
      type: Sequelize.STRING(180),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "categories", "meta_description", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "categories", "og_media_id", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "categories", "sort_order", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, "categories", "is_deleted", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await addColumnIfMissing(queryInterface, "categories", "created_by_user_id", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "categories", "updated_by_user_id", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
    });

    const categoryColumns = await queryInterface.describeTable("categories");
    if (categoryColumns.is_active) {
      await queryInterface.sequelize.query(
        `UPDATE categories
         SET status = CASE WHEN is_active = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END`,
      );
    }
    if (categoryColumns.display_order) {
      await queryInterface.sequelize.query("UPDATE categories SET sort_order = display_order");
    }

    await addConstraintIfMissing(queryInterface, "categories", {
      fields: ["parent_id"],
      type: "foreign key",
      name: "categories_parent_fk",
      references: { table: "categories", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
    await addConstraintIfMissing(queryInterface, "categories", {
      fields: ["og_media_id"],
      type: "foreign key",
      name: "categories_og_media_fk",
      references: { table: "media", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await addConstraintIfMissing(queryInterface, "categories", {
      fields: ["created_by_user_id"],
      type: "foreign key",
      name: "categories_created_by_user_fk",
      references: { table: "users", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await addConstraintIfMissing(queryInterface, "categories", {
      fields: ["updated_by_user_id"],
      type: "foreign key",
      name: "categories_updated_by_user_fk",
      references: { table: "users", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    if (await hasTable(queryInterface, "subcategories")) {
      const [subcategories] = await queryInterface.sequelize.query(
        `SELECT id, category_id, name, slug, description, media_id, is_active,
                display_order, created_at, updated_at
         FROM subcategories
         ORDER BY id`,
      );
      const subcategoryMap = new Map();

      for (const subcategory of subcategories) {
        const [alreadyMigrated] = await queryInterface.sequelize.query(
          `SELECT id FROM categories
           WHERE parent_id = ? AND name = ? AND description <=> ?
           ORDER BY id DESC LIMIT 1`,
          {
            replacements: [subcategory.category_id, subcategory.name, subcategory.description],
          },
        );
        let categoryId = alreadyMigrated[0]?.id;

        if (!categoryId) {
          const slug = await uniqueCategorySlug(queryInterface, subcategory.slug, subcategory.id);
          await queryInterface.sequelize.query(
            `INSERT INTO categories
              (name, slug, parent_id, description, short_description, media_id, status,
               meta_title, meta_description, og_media_id, sort_order, is_deleted,
               created_by_user_id, updated_by_user_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, ?, false, NULL, NULL, ?, ?)`,
            {
              replacements: [
                subcategory.name,
                slug,
                subcategory.category_id,
                subcategory.description,
                subcategory.media_id,
                subcategory.is_active ? "ACTIVE" : "INACTIVE",
                subcategory.display_order,
                subcategory.created_at,
                subcategory.updated_at,
              ],
            },
          );
          const [[created]] = await queryInterface.sequelize.query(
            "SELECT id FROM categories WHERE slug = ? LIMIT 1",
            { replacements: [slug] },
          );
          categoryId = created.id;
        }
        subcategoryMap.set(String(subcategory.id), categoryId);
      }

      for (const [subcategoryId, categoryId] of subcategoryMap) {
        await queryInterface.sequelize.query(
          "UPDATE products SET category_id = ? WHERE subcategory_id = ?",
          { replacements: [categoryId, subcategoryId] },
        );
      }
    }

    const productColumns = await queryInterface.describeTable("products");
    if (productColumns.subcategory_id) {
      await addIndexIfMissing(queryInterface, "products", ["metal_id"], {
        name: "products_metal_fk_idx",
      });
      await removeIndexIfPresent(queryInterface, "products", "products_taxonomy_status_idx");
      await dropForeignKeysForColumn(queryInterface, "products", "subcategory_id");
      await queryInterface.removeColumn("products", "subcategory_id");
    }
    await addIndexIfMissing(queryInterface, "products", ["metal_id", "category_id", "status"], {
      name: "products_taxonomy_status_idx",
    });

    if (await hasTable(queryInterface, "subcategories")) {
      await queryInterface.dropTable("subcategories");
    }
    await removeColumnIfPresent(queryInterface, "categories", "is_active");
    await removeColumnIfPresent(queryInterface, "categories", "display_order");

    await addIndexIfMissing(queryInterface, "categories", ["parent_id"], {
      name: "categories_parent_idx",
    });
    await addIndexIfMissing(queryInterface, "categories", ["status"], {
      name: "categories_status_idx",
    });
    await addIndexIfMissing(queryInterface, "categories", ["is_deleted"], {
      name: "categories_is_deleted_idx",
    });
    await addIndexIfMissing(queryInterface, "categories", ["sort_order"], {
      name: "categories_sort_order_idx",
    });

    if (await hasIndex(queryInterface, "categories", "slug_2")) {
      await queryInterface.removeIndex("categories", "slug_2");
    }
  },

  async down() {
    throw new Error(
      "The unified category hierarchy migration is irreversible because arbitrary-depth trees cannot be safely converted back to subcategories.",
    );
  },
};
