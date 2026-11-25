const asignacionService = require("../services/asignacion.service");
const { serializeAsignacion } = require("../utils/serializers");

function sendAsignacion(res, statusCode, message, asignacion) {
  return res.status(statusCode).json({
    success: true,
    message,
    data: serializeAsignacion(asignacion)
  });
}

async function listar(req, res, next) {
  try {
    const asignaciones = await asignacionService.listAsignaciones();

    return res.json({
      success: true,
      message: "Asignaciones obtenidas correctamente.",
      data: asignaciones.map(serializeAsignacion)
    });
  } catch (error) {
    return next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const asignacion = await asignacionService.getAsignacionById(req.params.id);
    return sendAsignacion(res, 200, "Asignación obtenida correctamente.", asignacion);
  } catch (error) {
    return next(error);
  }
}

async function crear(req, res, next) {
  try {
    const asignacion = await asignacionService.createAsignacion(req.body);
    return sendAsignacion(res, 201, "Asignación creada correctamente.", asignacion);
  } catch (error) {
    return next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const asignacion = await asignacionService.updateAsignacion(req.params.id, req.body);
    return sendAsignacion(res, 200, "Asignación actualizada correctamente.", asignacion);
  } catch (error) {
    return next(error);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const asignacion = await asignacionService.setAsignacionEstado(
      req.params.id,
      req.body.estado
    );
    return sendAsignacion(res, 200, "Estado de la asignación actualizado correctamente.", asignacion);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  cambiarEstado
};
