const servicioService = require("../services/servicio.service");
const { serializeServicio } = require("../utils/serializers");

function sendServicio(res, statusCode, message, servicio) {
  return res.status(statusCode).json({
    success: true,
    message,
    data: serializeServicio(servicio)
  });
}

async function listar(req, res, next) {
  try {
    const servicios = await servicioService.listServicios();

    return res.json({
      success: true,
      message: "Servicios obtenidos correctamente.",
      data: servicios.map(serializeServicio)
    });
  } catch (error) {
    return next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const servicio = await servicioService.getServicioById(req.params.id);
    return sendServicio(res, 200, "Servicio obtenido correctamente.", servicio);
  } catch (error) {
    return next(error);
  }
}

async function crear(req, res, next) {
  try {
    const servicio = await servicioService.createServicio(req.body);
    return sendServicio(res, 201, "Servicio creado correctamente.", servicio);
  } catch (error) {
    return next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const servicio = await servicioService.updateServicio(req.params.id, req.body);
    return sendServicio(res, 200, "Servicio actualizado correctamente.", servicio);
  } catch (error) {
    return next(error);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const servicio = await servicioService.setServicioActivo(req.params.id, req.body.activo);
    return sendServicio(res, 200, "Estado del servicio actualizado correctamente.", servicio);
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
