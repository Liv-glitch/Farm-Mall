require('dotenv').config();

// Enable SSL only when explicitly requested (DB_SSL=true) — cPanel MySQL is local, no TLS.
const sslEnabled = ['true', '1', 'yes', 'on'].includes(
  String(process.env.DB_SSL || '').trim().toLowerCase()
);
const dialectOptions = sslEnabled
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

const baseConfig = {
  username: process.env.DB_USER || 'agriculture_user',
  password: process.env.DB_PASSWORD || 'agriculture_pass123',
  database: process.env.DB_NAME || 'agriculture_db',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  dialectOptions,
};

module.exports = {
  development: {
    ...baseConfig,
    logging: console.log,
  },
  test: {
    ...baseConfig,
    database: process.env.DB_NAME || 'agriculture_db_test',
    logging: false,
  },
  production: {
    ...baseConfig,
    logging: false,
  },
};
