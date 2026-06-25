require("dotenv").config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  dialect: "mysql",
  timezone: process.env.DB_TIMEZONE || "+00:00",
  migrationStorageTableName: "sequelize_meta",
};

module.exports = {
  development: base,
  test: {
    ...base,
    database: process.env.DB_TEST_NAME || `${process.env.DB_NAME}_test`,
  },
  production: {
    ...base,
    logging: false,
  },
};
