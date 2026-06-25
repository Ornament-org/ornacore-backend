export default function operationsAssociations(db) {
  db.User.hasMany(db.Notification, { foreignKey: "userId", as: "notifications" });
  db.Notification.belongsTo(db.User, { foreignKey: "userId", as: "user" });

  db.User.hasMany(db.AuditLog, { foreignKey: "actorUserId", as: "auditLogs" });
  db.AuditLog.belongsTo(db.User, { foreignKey: "actorUserId", as: "actor" });

  db.User.hasMany(db.Media, { foreignKey: "uploadedByUserId", as: "uploadedMedia" });
  db.Media.belongsTo(db.User, { foreignKey: "uploadedByUserId", as: "uploadedBy" });
}
