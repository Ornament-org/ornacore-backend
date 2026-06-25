"use strict";

const normalizeTableNames = (tables) =>
  new Set(
    tables.map((table) =>
      typeof table === "string" ? table : (table.tableName ?? Object.values(table)[0]),
    ),
  );

const collectReferencedUserIds = async (queryInterface) => {
  const [references] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME = 'users'`,
  );
  const ids = new Set();

  for (const { tableName, columnName } of references) {
    if (!/^[a-zA-Z0-9_]+$/.test(tableName) || !/^[a-zA-Z0-9_]+$/.test(columnName)) continue;
    const [rows] = await queryInterface.sequelize.query(
      `SELECT DISTINCT \`${columnName}\` AS id
       FROM \`${tableName}\`
       WHERE \`${columnName}\` IS NOT NULL`,
    );
    rows.forEach(({ id }) => ids.add(String(id)));
  }

  return [...ids].sort((left, right) => Number(left) - Number(right));
};

const createUsersTable = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("users", {
    id: {
      type: Sequelize.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    email: { type: Sequelize.STRING(191), allowNull: true, unique: true },
    mobile: { type: Sequelize.STRING(32), allowNull: true, unique: true },
    password_hash: { type: Sequelize.STRING(255), allowNull: true },
    must_change_password: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    actor_type: {
      type: Sequelize.ENUM("ADMIN", "STAFF", "SHOPKEEPER", "SYSTEM"),
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("ACTIVE", "INACTIVE", "BLOCKED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    email_verified_at: { type: Sequelize.DATE, allowNull: true },
    mobile_verified_at: { type: Sequelize.DATE, allowNull: true },
    last_login_at: { type: Sequelize.DATE, allowNull: true },
    deleted_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.addIndex("users", ["actor_type", "status"], {
    name: "users_actor_type_status_idx",
  });
};

const createUserRolesTable = (queryInterface, Sequelize) =>
  queryInterface.createTable("user_roles", {
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    role_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: "roles", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    assigned_by_user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false },
  });

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const referencedUserIds = await collectReferencedUserIds(queryInterface);
    let tables = normalizeTableNames(await queryInterface.showAllTables());

    if (!tables.has("users")) {
      await createUsersTable(queryInterface, Sequelize);
      const now = new Date();
      const staffIds = new Set();

      if (tables.has("staff_profiles")) {
        const [staffRows] = await queryInterface.sequelize.query(
          "SELECT DISTINCT user_id AS id FROM staff_profiles",
        );
        staffRows.forEach(({ id }) => staffIds.add(String(id)));
      }

      if (referencedUserIds.length) {
        await queryInterface.bulkInsert(
          "users",
          referencedUserIds.map((id) => ({
            id,
            email: null,
            mobile: null,
            password_hash: null,
            must_change_password: true,
            actor_type: staffIds.has(id) ? "STAFF" : "SYSTEM",
            status: "INACTIVE",
            email_verified_at: null,
            mobile_verified_at: null,
            last_login_at: null,
            deleted_at: null,
            created_at: now,
            updated_at: now,
          })),
        );
      }
      tables = normalizeTableNames(await queryInterface.showAllTables());
    } else {
      const columns = await queryInterface.describeTable("users");
      if (columns.deletedAt && !columns.deleted_at) {
        await queryInterface.renameColumn("users", "deletedAt", "deleted_at");
      } else if (!columns.deleted_at) {
        await queryInterface.addColumn("users", "deleted_at", {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }
    }

    if (!tables.has("user_roles")) {
      await createUserRolesTable(queryInterface, Sequelize);
    }
  },

  async down() {
    // Recovery migration intentionally has no destructive rollback.
  },
};
