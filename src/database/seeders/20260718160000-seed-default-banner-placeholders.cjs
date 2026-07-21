"use strict";

/**
 * Seeds the "Home Hero" banner placement (key: home_hero) — the storefront's
 * hero carousel reads banners assigned to this exact key. Seeding it up front
 * means admins never have to guess the placement key by hand.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `INSERT INTO banner_placeholders (name, \`key\`, description, status, created_at, updated_at)
       VALUES ('Home Hero', 'home_hero', 'Rotating banner at the top of the storefront homepage.', 'ACTIVE', NOW(), NOW())
       ON DUPLICATE KEY UPDATE id = id`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM banner_placeholders WHERE \`key\` = 'home_hero'`,
    );
  },
};
