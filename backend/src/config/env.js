const fs = require("fs");
const path = require("path");

const envCandidates = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env")
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
  }
}

require("dotenv").config();

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== "" && value !== null);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["true", "1", "yes", "required"].includes(String(value).trim().toLowerCase());
}

function parseDatabaseUrl(raw) {
  if (!raw) {
    return {};
  }

  try {
    const url = new URL(raw);
    const database = decodeURIComponent(url.pathname.replace(/^\//, "")).split("?")[0];
    const sslParam = url.searchParams.get("ssl") || url.searchParams.get("sslmode");

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: database || undefined,
      ssl: sslParam ? parseBoolean(sslParam, true) : undefined
    };
  } catch (error) {
    console.warn("DATABASE_URL no tiene un formato válido y será ignorada.");
    return {};
  }
}

const fromUrl = parseDatabaseUrl(process.env.DATABASE_URL);

const host = firstDefined(process.env.DB_HOST, process.env.TIDB_HOST, fromUrl.host, "localhost");
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(String(host).toLowerCase());
const isTidbCloud = String(host).toLowerCase().includes("tidbcloud.com");
const sslFromEnv = firstDefined(process.env.DB_SSL, process.env.TIDB_ENABLE_SSL);
const sslEnabled = parseBoolean(sslFromEnv, fromUrl.ssl !== undefined ? fromUrl.ssl : !isLocalHost || isTidbCloud);

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(firstDefined(process.env.PORT, 3000)) || 3000,
  DB_HOST: host,
  DB_PORT: Number(firstDefined(process.env.DB_PORT, process.env.TIDB_PORT, fromUrl.port, isTidbCloud ? 4000 : 3306)) || (isTidbCloud ? 4000 : 3306),
  DB_USER: firstDefined(process.env.DB_USER, process.env.TIDB_USER, fromUrl.user, "root"),
  DB_PASSWORD: firstDefined(process.env.DB_PASSWORD, process.env.TIDB_PASSWORD, fromUrl.password, ""),
  DB_NAME: firstDefined(process.env.DB_NAME, process.env.TIDB_DATABASE, fromUrl.database, "secure_net"),
  DB_SSL: sslEnabled,
  DB_SSL_CA: firstDefined(process.env.DB_SSL_CA, process.env.TIDB_CA_PATH),
  CORS_ORIGIN: firstDefined(process.env.CORS_ORIGIN, "*"),
  JWT_SECRET: firstDefined(process.env.JWT_SECRET, "change_this_secret"),
  JWT_EXPIRES_IN: firstDefined(process.env.JWT_EXPIRES_IN, "8h")
};

module.exports = { env };
