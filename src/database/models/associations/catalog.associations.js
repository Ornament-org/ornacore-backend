export default function catalogAssociations(db) {
  db.Category.belongsTo(db.Media, { foreignKey: "mediaId", as: "image" });
  db.Category.belongsTo(db.Media, { foreignKey: "ogMediaId", as: "ogImage" });
  db.Category.belongsTo(db.Category, { foreignKey: "parentId", as: "parent" });
  db.Category.hasMany(db.Category, { foreignKey: "parentId", as: "children" });
  db.Category.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.Metal.hasMany(db.Category, { foreignKey: "metalId", as: "categories" });
  db.Category.belongsTo(db.User, { foreignKey: "createdByUserId", as: "createdBy" });
  db.Category.belongsTo(db.User, { foreignKey: "updatedByUserId", as: "updatedBy" });

  db.Product.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.Metal.hasMany(db.Product, { foreignKey: "metalId", as: "products" });
  db.Product.hasMany(db.ProductCategoryMapping, {
    foreignKey: "productId",
    as: "categoryMappings",
  });
  db.ProductCategoryMapping.belongsTo(db.Product, {
    foreignKey: "productId",
    as: "product",
  });
  db.Category.hasMany(db.ProductCategoryMapping, {
    foreignKey: "categoryId",
    as: "productMappings",
  });
  db.ProductCategoryMapping.belongsTo(db.Category, {
    foreignKey: "categoryId",
    as: "category",
  });
  db.Product.belongsToMany(db.Category, {
    through: db.ProductCategoryMapping,
    foreignKey: "productId",
    otherKey: "categoryId",
    as: "categories",
  });
  db.Category.belongsToMany(db.Product, {
    through: db.ProductCategoryMapping,
    foreignKey: "categoryId",
    otherKey: "productId",
    as: "products",
  });

  db.Product.hasMany(db.ProductVariant, { foreignKey: "productId", as: "variants" });
  db.ProductVariant.belongsTo(db.Product, { foreignKey: "productId", as: "product" });

  db.Product.hasMany(db.ProductImage, { foreignKey: "productId", as: "images" });
  db.ProductImage.belongsTo(db.Product, { foreignKey: "productId", as: "product" });
  db.ProductImage.belongsTo(db.ProductVariant, {
    foreignKey: "productVariantId",
    as: "variant",
  });
  db.ProductImage.belongsTo(db.Media, { foreignKey: "mediaId", as: "media" });
  db.Media.hasMany(db.ProductImage, { foreignKey: "mediaId", as: "productMappings" });
}
