const reporteService = require("../services/reporte.service");
const { serializeReporte } = require("../utils/serializers");

function sendReporte(res, statusCode, message, reporte) {
  const data = serializeReporte(reporte);

  if (JSON.stringify(data).includes("clave_hash")) {
    throw new Error("La respuesta no debe incluir clave_hash.");
  }

  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

async function listar(req, res, next) {
  try {
    const reportes = await reporteService.listReportes({
      id_usuario: req.query.id_usuario,
      tipo: req.query.tipo
    });
    const data = reportes.map(serializeReporte);

    if (JSON.stringify(data).includes("clave_hash")) {
      throw new Error("La respuesta no debe incluir clave_hash.");
    }

    return res.json({
      success: true,
      message: "Reportes obtenidos correctamente.",
      data
    });
  } catch (error) {
    return next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const reporte = await reporteService.getReporteById(req.params.id);
    return sendReporte(res, 200, "Reporte obtenido correctamente.", reporte);
  } catch (error) {
    return next(error);
  }
}

async function crear(req, res, next) {
  try {
    const reporte = await reporteService.createReporte(req.body, req.user.sub);
    return sendReporte(res, 201, "Reporte generado correctamente.", reporte);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear
};
