export default function identityAssociations(db) {
  db.User.hasMany(db.RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
  db.RefreshToken.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  db.RefreshToken.belongsTo(db.RefreshToken, {
    foreignKey: "replacedByTokenId",
    as: "replacementToken",
  });

  db.User.hasMany(db.OtpChallenge, { foreignKey: "userId", as: "otpChallenges" });
  db.OtpChallenge.belongsTo(db.User, { foreignKey: "userId", as: "user" });

  db.User.hasOne(db.StaffProfile, { foreignKey: "userId", as: "staffProfile" });
  db.StaffProfile.belongsTo(db.User, { foreignKey: "userId", as: "user" });

  db.User.hasOne(db.ShopkeeperProfile, { foreignKey: "userId", as: "shopkeeperProfile" });
  db.ShopkeeperProfile.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  db.ShopkeeperProfile.belongsTo(db.StaffProfile, {
    foreignKey: "assignedSalespersonId",
    as: "assignedSalesperson",
  });
  db.ShopkeeperProfile.belongsTo(db.User, {
    foreignKey: "approvedByUserId",
    as: "approvedBy",
  });
  db.ShopkeeperProfile.hasMany(db.ShopkeeperAddress, {
    foreignKey: "shopkeeperId",
    as: "addresses",
  });
  db.ShopkeeperAddress.belongsTo(db.ShopkeeperProfile, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });

  db.User.belongsToMany(db.Role, {
    through: db.UserRole,
    foreignKey: "userId",
    otherKey: "roleId",
    as: "roles",
  });
  db.Role.belongsToMany(db.User, {
    through: db.UserRole,
    foreignKey: "roleId",
    otherKey: "userId",
    as: "users",
  });
  db.UserRole.belongsTo(db.User, { foreignKey: "assignedByUserId", as: "assignedBy" });

  db.Role.belongsToMany(db.Permission, {
    through: db.RolePermission,
    foreignKey: "roleId",
    otherKey: "permissionId",
    as: "permissions",
  });
  db.Permission.belongsToMany(db.Role, {
    through: db.RolePermission,
    foreignKey: "permissionId",
    otherKey: "roleId",
    as: "roles",
  });
}
