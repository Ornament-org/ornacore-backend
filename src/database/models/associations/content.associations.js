const contentAssociations = (db) => {
  db.HomepageConfig.hasMany(db.HomepageSection, {
    foreignKey: "homepageId",
    as: "sections",
    onDelete: "CASCADE",
  });
  db.HomepageSection.belongsTo(db.HomepageConfig, { foreignKey: "homepageId", as: "homepage" });

  db.HomepageConfig.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.HomepageConfig.belongsTo(db.User, { foreignKey: "updatedByUserId", as: "updatedBy" });

  db.BannerPlaceholder.hasMany(db.Banner, { foreignKey: "placementId", as: "banners" });
  db.Banner.belongsTo(db.BannerPlaceholder, { foreignKey: "placementId", as: "placement" });
  db.Banner.belongsTo(db.Metal, { foreignKey: "metalId", as: "metal" });
  db.Metal.hasMany(db.Banner, { foreignKey: "metalId", as: "banners" });
  db.Banner.belongsTo(db.Media, { foreignKey: "imageId", as: "image" });
  db.Banner.belongsTo(db.Media, { foreignKey: "mobileImageId", as: "mobileImage" });
  db.Banner.belongsTo(db.User, { foreignKey: "createdByUserId", as: "createdBy" });
  db.Banner.belongsTo(db.User, { foreignKey: "updatedByUserId", as: "updatedBy" });
  db.BannerPlaceholder.belongsTo(db.User, { foreignKey: "createdByUserId", as: "createdBy" });
  db.BannerPlaceholder.belongsTo(db.User, { foreignKey: "updatedByUserId", as: "updatedBy" });
};

export default contentAssociations;
