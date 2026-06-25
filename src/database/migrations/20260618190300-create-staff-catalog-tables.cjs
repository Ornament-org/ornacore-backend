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

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("staff_profiles", {
      id: id(Sequelize),
      user_id: {
        ...foreignId(Sequelize, "users", { onDelete: "CASCADE" }),
        unique: true,
      },
      employee_code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      full_name: { type: Sequelize.STRING(191), allowNull: false },
      designation: { type: Sequelize.STRING(120), allowNull: true },
      reports_to_staff_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      joined_at: { type: Sequelize.DATEONLY, allowNull: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("staff_profiles", {
      fields: ["reports_to_staff_id"],
      type: "foreign key",
      name: "staff_profiles_manager_fk",
      references: { table: "staff_profiles", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.createTable("media", {
      id: id(Sequelize),
      public_id: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      secure_url: { type: Sequelize.TEXT, allowNull: false },
      resource_type: { type: Sequelize.STRING(50), allowNull: false },
      folder: { type: Sequelize.STRING(255), allowNull: false },
      original_filename: { type: Sequelize.STRING(255), allowNull: true },
      mime_type: { type: Sequelize.STRING(120), allowNull: true },
      size_bytes: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      width: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      height: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      uploaded_by_user_id: foreignId(Sequelize, "users", { onDelete: "RESTRICT" }),
      owner_type: { type: Sequelize.STRING(100), allowNull: true },
      owner_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("media", ["owner_type", "owner_id"], {
      name: "media_owner_idx",
    });

    await queryInterface.createTable("metals", {
      id: id(Sequelize),
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      display_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable("categories", {
      id: id(Sequelize),
      name: { type: Sequelize.STRING(120), allowNull: false },
      slug: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      media_id: foreignId(Sequelize, "media", { allowNull: true, onDelete: "SET NULL" }),
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      display_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable("subcategories", {
      id: id(Sequelize),
      category_id: foreignId(Sequelize, "categories", { onDelete: "CASCADE" }),
      name: { type: Sequelize.STRING(120), allowNull: false },
      slug: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      media_id: foreignId(Sequelize, "media", { allowNull: true, onDelete: "SET NULL" }),
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      display_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("subcategories", ["category_id", "slug"], {
      unique: true,
      name: "subcategories_category_slug_uq",
    });

    await queryInterface.createTable("products", {
      id: id(Sequelize),
      metal_id: foreignId(Sequelize, "metals"),
      category_id: foreignId(Sequelize, "categories"),
      subcategory_id: foreignId(Sequelize, "subcategories"),
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
    await queryInterface.addIndex(
      "products",
      ["metal_id", "category_id", "subcategory_id", "status"],
      { name: "products_taxonomy_status_idx" },
    );
    await queryInterface.addIndex("products", ["name"], { name: "products_name_idx" });

    await queryInterface.createTable("product_variants", {
      id: id(Sequelize),
      product_id: foreignId(Sequelize, "products", { onDelete: "CASCADE" }),
      sku: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(191), allowNull: true },
      purity: { type: Sequelize.STRING(50), allowNull: true },
      karat: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      weight_grams: { type: Sequelize.DECIMAL(14, 3), allowNull: true },
      minimum_order_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: "1.000",
      },
      attributes: { type: Sequelize.JSON, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("product_variants", ["product_id", "is_active"], {
      name: "product_variants_product_active_idx",
    });

    await queryInterface.createTable("product_images", {
      id: id(Sequelize),
      product_id: foreignId(Sequelize, "products", { onDelete: "CASCADE" }),
      product_variant_id: foreignId(Sequelize, "product_variants", {
        allowNull: true,
        onDelete: "CASCADE",
      }),
      media_id: foreignId(Sequelize, "media", { onDelete: "CASCADE" }),
      alt_text: { type: Sequelize.STRING(255), allowNull: true },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      display_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex("product_images", ["product_id", "media_id"], {
      unique: true,
      name: "product_images_product_media_uq",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("product_images");
    await queryInterface.dropTable("product_variants");
    await queryInterface.dropTable("products");
    await queryInterface.dropTable("subcategories");
    await queryInterface.dropTable("categories");
    await queryInterface.dropTable("metals");
    await queryInterface.dropTable("media");
    await queryInterface.dropTable("staff_profiles");
  },
};
