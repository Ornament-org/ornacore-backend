import db from "../../database/models/InitializeModels.js";

export const notificationService = {
  async listForUser(userId) {
    return db.Notification.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
  },
};
