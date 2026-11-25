const { pool } = require("../config/db");
const { env } = require("../config/env");

async function checkMysqlConnection() {
  const [infoRows] = await pool.query(
    "SELECT DATABASE() AS database_name, NOW() AS server_time"
  );

  const [tables] = await pool.query("SHOW TABLES");
  const tableNames = tables.map((row) => Object.values(row)[0]);

  return {
    configuredDatabase: env.DB_NAME,
    connectedDatabase: infoRows[0].database_name,
    serverTime: infoRows[0].server_time,
    tables: tableNames
  };
}

module.exports = { checkMysqlConnection };
