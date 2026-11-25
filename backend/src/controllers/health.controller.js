const healthService = require("../services/health.service");

function getHealth(req, res) {
  res.json({
    success: true,
    message: "Secure Net API is running.",
    data: {
      service: "secure-net-api",
      database: "secure_net"
    }
  });
}

async function getMysqlHealth(req, res, next) {
  try {
    const data = await healthService.checkMysqlConnection();

    if (data.connectedDatabase !== "secure_net") {
      return res.status(503).json({
        success: false,
        message: "La conexión no está usando la base de datos secure_net.",
        data
      });
    }

    return res.json({
      success: true,
      message: "Conexión a MySQL secure_net verificada.",
      data
    });
  } catch (error) {
    error.statusCode = 503;
    error.message = `No fue posible conectar con MySQL: ${error.message}`;
    return next(error);
  }
}

module.exports = { getHealth, getMysqlHealth };
