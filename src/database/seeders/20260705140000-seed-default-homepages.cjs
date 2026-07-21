"use strict";

/**
 * Seeds the default HOME_B2B and HOME_B2C homepages, active immediately.
 * Uses no-op upserts (ON DUPLICATE KEY UPDATE id = id) so re-running seeders
 * never overwrites admin customizations made after the first seed.
 */
module.exports = {
  async up(queryInterface) {
    const { DEFAULT_HOMEPAGES } = await import("../../modules/homepage/homepage.defaults.js");
    const sequelize = queryInterface.sequelize;

    for (const template of Object.values(DEFAULT_HOMEPAGES)) {
      await sequelize.query(
        `INSERT INTO homepage_configs
           (homepage_key, audience_type, metal_id, title, is_default, status, created_at, updated_at)
         VALUES (:key, :audience, NULL, :title, 1, 'ACTIVE', NOW(), NOW())
         ON DUPLICATE KEY UPDATE id = id`,
        {
          replacements: {
            key: template.homepageKey,
            audience: template.audienceType,
            title: template.title,
          },
        },
      );

      const [[configRow]] = await sequelize.query(
        `SELECT id FROM homepage_configs WHERE homepage_key = :key`,
        { replacements: { key: template.homepageKey } },
      );
      const homepageId = configRow.id;

      for (let index = 0; index < template.sections.length; index += 1) {
        const section = template.sections[index];
        await sequelize.query(
          `INSERT INTO homepage_sections
             (homepage_id, section_type, section_key, title, subtitle, config_json, sort_order, is_active, created_at, updated_at)
           VALUES (:homepageId, :sectionType, :sectionKey, :title, :subtitle, :config, :sortOrder, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE id = id`,
          {
            replacements: {
              homepageId,
              sectionType: section.sectionType,
              sectionKey: section.sectionKey,
              title: section.title,
              subtitle: section.subtitle,
              config: JSON.stringify(section.config ?? {}),
              sortOrder: index,
            },
          },
        );
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM homepage_configs WHERE homepage_key IN ('HOME_B2B', 'HOME_B2C')`,
    );
  },
};
