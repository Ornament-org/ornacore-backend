const TABLE = "product_images";
const OLD_UNIQUE_INDEX = "product_images_product_media_uq";
const PRODUCT_MEDIA_INDEX = "product_images_product_media_idx";
const PRODUCT_VARIANT_MEDIA_INDEX = "product_images_product_variant_media_idx";

const hasTable = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === "string" ? table : (table.tableName ?? Object.values(table)[0]);
    return name === tableName;
  });
};

const hasIndex = (indexes, indexName) => indexes.some((index) => index.name === indexName);

const addIndexIfMissing = async (queryInterface, indexes, fields, options) => {
  if (!hasIndex(indexes, options.name)) {
    await queryInterface.addIndex(TABLE, fields, options);
  }
};

export const repairProductImageMediaIndexes = async (db, logger) => {
  const queryInterface = db.sequelize.getQueryInterface();
  if (!(await hasTable(queryInterface, TABLE))) return;

  let indexes = await queryInterface.showIndex(TABLE);
  if (hasIndex(indexes, OLD_UNIQUE_INDEX)) {
    await queryInterface.removeIndex(TABLE, OLD_UNIQUE_INDEX);
    logger.info("Removed legacy product image media unique index", {
      table: TABLE,
      index: OLD_UNIQUE_INDEX,
    });
    indexes = indexes.filter((index) => index.name !== OLD_UNIQUE_INDEX);
  }

  await addIndexIfMissing(queryInterface, indexes, ["product_id", "media_id"], {
    name: PRODUCT_MEDIA_INDEX,
  });
  indexes = await queryInterface.showIndex(TABLE);
  await addIndexIfMissing(queryInterface, indexes, ["product_id", "product_variant_id", "media_id"], {
    name: PRODUCT_VARIANT_MEDIA_INDEX,
  });
};
