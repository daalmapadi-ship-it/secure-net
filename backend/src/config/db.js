const fs = require("fs");
const mysql = require("mysql2/promise");
const { env } = require("./env");

function buildSslConfig() {
  if (!env.DB_SSL) {
    return undefined;
  }

  const ssl = { minVersion: "TLSv1.2" };

  if (env.DB_SSL_CA) {
    ssl.ca = fs.readFileSync(env.DB_SSL_CA);
  }

  return ssl;
}

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: buildSslConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 20000,
  dateStrings: ["DATE"],
  timezone: "Z"
});

async function getConnection() {
  return pool.getConnection();
}

async function closePool() {
  await pool.end();
}

module.exports = { pool, getConnection, closePool };
