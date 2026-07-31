"use strict";

const TABLE = "product_images";
const OLD_UNIQUE_INDEX = "product_images_product_media_uq";
const PRODUCT_MEDIA_INDEX = "product_images_product_media_idx";
const PRODUCT_VARIANT_MEDIA_INDEX = "product_images_product_variant_media_idx";

const indexExists = async (queryInterface, table, name) => {
  const indexes = await queryInterface.showIndex(table);
  return indexes.some((index) => index.name === name);
};

const removeIndexIfExists = async (queryInterface, table, name) => {
  if (await indexExists(queryInterface, table, name)) {
    await queryInterface.removeIndex(table, name);
  }
};

const addIndexIfMissing = async (queryInterface, table, fields, options) => {
  if (!(await indexExists(queryInterface, table, options.name))) {
    await queryInterface.addIndex(table, fields, options);
  }
};

module.exports = {
  async up(queryInterface) {
    await removeIndexIfExists(queryInterface, TABLE, OLD_UNIQUE_INDEX);

    await addIndexIfMissing(queryInterface, TABLE, ["product_id", "media_id"], {
      name: PRODUCT_MEDIA_INDEX,
    });
    await addIndexIfMissing(queryInterface, TABLE, ["product_id", "product_variant_id", "media_id"], {
      name: PRODUCT_VARIANT_MEDIA_INDEX,
    });
  },

  async down(queryInterface) {
    await removeIndexIfExists(queryInterface, TABLE, PRODUCT_VARIANT_MEDIA_INDEX);
    await removeIndexIfExists(queryInterface, TABLE, PRODUCT_MEDIA_INDEX);

    await addIndexIfMissing(queryInterface, TABLE, ["product_id", "media_id"], {
      unique: true,
      name: OLD_UNIQUE_INDEX,
    });
  },
};
