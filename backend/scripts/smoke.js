const http = require("http");
const app = require("../src/app");
const { closePool } = require("../src/config/db");

function request(port, pathName) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: "127.0.0.1", port, path: pathName }, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ statusCode: response.statusCode, body });
        });
      })
      .on("error", reject);
  });
}

async function main() {
  const server = app.listen(0, "127.0.0.1");

  await new Promise((resolve) => {
    server.on("listening", resolve);
  });

  const { port } = server.address();
  const health = await request(port, "/health");
  const payload = JSON.parse(health.body);

  if (health.statusCode !== 200 || payload.success !== true) {
    throw new Error(`Health check falló: ${health.statusCode} ${health.body}`);
  }

  if (payload.data.database !== "secure_net") {
    throw new Error("El health check no reporta la base secure_net.");
  }

  require("../src/services/cliente.service");
  require("../src/services/usuario.service");
  require("../src/services/categoria.service");
  require("../src/services/servicio.service");
  require("../src/services/asignacion.service");
  require("../src/services/reporte.service");
  require("../src/utils/insert");

  server.close();
  await closePool();
  console.log("Smoke test OK: el backend inicia y /health responde.");
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await closePool();
  } catch (_closeError) {
    // ignore
  }
  process.exit(1);
});
