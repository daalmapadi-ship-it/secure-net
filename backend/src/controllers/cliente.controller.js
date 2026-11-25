const clienteService = require("../services/cliente.service");
const { serializeCliente } = require("../utils/serializers");

function sendCliente(res, statusCode, message, cliente) {
  return res.status(statusCode).json({
    success: true,
    message,
    data: serializeCliente(cliente)
  });
}

async function listar(req, res, next) {
  try {
    const clientes = await clienteService.listClientes();

    return res.json({
      success: true,
      message: "Clientes obtenidos correctamente.",
      data: clientes.map(serializeCliente)
    });
  } catch (error) {
    return next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const cliente = await clienteService.getClienteById(req.params.id);
    return sendCliente(res, 200, "Cliente obtenido correctamente.", cliente);
  } catch (error) {
    return next(error);
  }
}

async function crear(req, res, next) {
  try {
    const cliente = await clienteService.createCliente(req.body);
    return sendCliente(res, 201, "Cliente creado correctamente.", cliente);
  } catch (error) {
    return next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const cliente = await clienteService.updateCliente(req.params.id, req.body);
    return sendCliente(res, 200, "Cliente actualizado correctamente.", cliente);
  } catch (error) {
    return next(error);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const cliente = await clienteService.setClienteActivo(req.params.id, req.body.activo);
    return sendCliente(res, 200, "Estado del cliente actualizado correctamente.", cliente);
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
