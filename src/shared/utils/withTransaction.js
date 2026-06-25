import { sequelize } from "../../config/database.js";

export const withTransaction = (work, options = {}) =>
  sequelize.transaction(options, (transaction) => work(transaction));
