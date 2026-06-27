import { Sequelize } from "sequelize";
import { env } from "./env.js";
import { logger } from "./logger.js";

export const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: "mysql",
  timezone: env.DB_TIMEZONE,
  logging: env.DB_LOGGING ? (message) => logger.debug("Database query:", message) : false,
  define: {
    underscored: true,
    timestamps: true,
    freezeTableName: true,
  },
  pool: {
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
    acquire: 30000,
    idle: 600000, // 10 min — remote DB; don't evict min-connections immediately
    evict: 60000,
  },
  dialectOptions: {
    decimalNumbers: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
  },
});
