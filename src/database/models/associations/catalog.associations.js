export default function catalogAssociations(db) {
  db.Category.belongsTo(db.Media, { foreignKey: "mediaId", as: "image" });
  db.Category.belongsTo(db.Media, { foreignKey: "ogMediaId", as: "ogImage" });
  db.Category.belongsTo(db.Category, { foreignKey: "parentId", as: "parent" });
  db.Category.hasMany(db.Category, { foreignKey: "parentId", as: "children" });
  db.Category.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.Metal.hasMany(db.Category, { foreignKey: "metalId", as: "categories" });
  db.Category.belongsTo(db.User, { foreignKey: "createdByUserId", as: "createdBy" });
  db.Category.belongsTo(db.User, { foreignKey: "updatedByUserId", as: "updatedBy" });

  db.Collection.belongsTo(db.Media, { foreignKey: "mediaId", as: "image" });
  db.Collection.belongsTo(db.User, { foreignKey: "createdByUserId", as: "createdBy" });
  db.Collection.belongsTo(db.User, { foreignKey: "updatedByUserId", as: "updatedBy" });
  db.Collection.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.Metal.hasMany(db.Collection, { foreignKey: "metalId", as: "collections" });

  db.Collection.hasMany(db.CollectionProduct, {
    foreignKey: "collectionId",
    as: "productLinks",
  });
  db.CollectionProduct.belongsTo(db.Collection, {
    foreignKey: "collectionId",
    as: "collection",
  });
  db.CollectionProduct.belongsTo(db.Product, { foreignKey: "productId", as: "product" });
  db.Product.hasMany(db.CollectionProduct, { foreignKey: "productId", as: "collectionLinks" });

  db.Collection.hasMany(db.CollectionCategory, {
    foreignKey: "collectionId",
    as: "categoryLinks",
  });
  db.CollectionCategory.belongsTo(db.Collection, {
    foreignKey: "collectionId",
    as: "collection",
  });
  db.CollectionCategory.belongsTo(db.Category, { foreignKey: "categoryId", as: "category" });
  db.Category.hasMany(db.CollectionCategory, { foreignKey: "categoryId", as: "collectionLinks" });

  db.Product.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.Metal.hasMany(db.Product, { foreignKey: "metalId", as: "products" });

  db.Metal.hasMany(db.MetalRate, { foreignKey: "metalId", as: "rates" });
  db.MetalRate.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.MetalRate.belongsTo(db.User, { foreignKey: "createdByUserId", as: "createdBy" });
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

  // Variant attribute system
  db.Attribute.hasMany(db.AttributeValue, { foreignKey: "attributeId", as: "values" });
  db.AttributeValue.belongsTo(db.Attribute, { foreignKey: "attributeId", as: "attribute" });

  db.ProductVariant.belongsToMany(db.AttributeValue, {
    through: db.ProductVariantAttribute,
    foreignKey: "variantId",
    otherKey: "attributeValueId",
    as: "attributeValues",
  });
  db.AttributeValue.belongsToMany(db.ProductVariant, {
    through: db.ProductVariantAttribute,
    foreignKey: "attributeValueId",
    otherKey: "variantId",
    as: "variants",
  });
  db.ProductVariantAttribute.belongsTo(db.AttributeValue, {
    foreignKey: "attributeValueId",
    as: "attributeValue",
  });
  db.ProductVariantAttribute.belongsTo(db.ProductVariant, {
    foreignKey: "variantId",
    as: "variant",
  });
}
