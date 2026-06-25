"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("shopkeeper_addresses", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      shopkeeper_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: "shopkeeper_profiles", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "Primary",
      },
      contact_name: {
        type: Sequelize.STRING(191),
        allowNull: true,
      },
      contact_mobile: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      address_line1: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      address_line2: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      pincode: {
        type: Sequelize.STRING(12),
        allowNull: false,
      },
      country: {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: "India",
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("shopkeeper_addresses", ["shopkeeper_id", "is_primary"], {
      name: "shopkeeper_addresses_primary_idx",
    });
    await queryInterface.addIndex("shopkeeper_addresses", ["shopkeeper_id", "is_active"], {
      name: "shopkeeper_addresses_active_idx",
    });

    const [profiles] = await queryInterface.sequelize.query(
      `SELECT id, owner_name, address_line1, address_line2, city, state, pincode
       FROM shopkeeper_profiles
       WHERE address_line1 IS NOT NULL
         AND city IS NOT NULL
         AND state IS NOT NULL
         AND pincode IS NOT NULL`,
    );

    if (profiles.length) {
      const now = new Date();
      await queryInterface.bulkInsert(
        "shopkeeper_addresses",
        profiles.map((profile) => ({
          shopkeeper_id: profile.id,
          label: "Primary",
          contact_name: profile.owner_name,
          contact_mobile: null,
          address_line1: profile.address_line1,
          address_line2: profile.address_line2,
          city: profile.city,
          state: profile.state,
          pincode: profile.pincode,
          country: "India",
          is_primary: true,
          is_active: true,
          created_at: now,
          updated_at: now,
        })),
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("shopkeeper_addresses");
  },
};
