"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE metals
          SET code = 'GOLD', rate_unit = 'PER_10G', updated_at = NOW()
        WHERE UPPER(name) = 'GOLD'`,
    );

    await queryInterface.sequelize.query(
      `UPDATE metals
          SET code = 'SILVER', rate_unit = 'PER_KG', updated_at = NOW()
        WHERE UPPER(name) = 'SILVER'`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE metals
          SET rate_unit = 'PER_10G', updated_at = NOW()
        WHERE UPPER(name) IN ('GOLD', 'SILVER')`,
    );
  },
};
