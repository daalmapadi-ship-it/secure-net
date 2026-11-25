const app = require("./app");
const { env } = require("./config/env");
const { closePool } = require("./config/db");

if (env.DB_NAME !== "secure_net") {
  console.warn(`Advertencia: DB_NAME=${env.DB_NAME}. El proyecto debe usar la base existente secure_net.`);
}

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Secure Net API listening on port ${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`Recibida señal ${signal}. Cerrando servidor.`);
  server.close(async () => {
    try {
      await closePool();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  shutdown("SIGINT");
});
