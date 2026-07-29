"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE order_items AS order_item
      SET image_url_snapshot = (
        SELECT media.secure_url
        FROM product_images AS product_image
        INNER JOIN media AS media ON media.id = product_image.media_id
        WHERE product_image.product_id = order_item.product_id
        ORDER BY product_image.is_primary DESC, product_image.display_order ASC, product_image.id ASC
        LIMIT 1
      )
      WHERE order_item.image_url_snapshot IS NULL
        AND order_item.product_id IS NOT NULL
    `);
  },

  async down() {
    // Snapshot backfill is intentionally kept; removing it would erase order history.
  },
};
