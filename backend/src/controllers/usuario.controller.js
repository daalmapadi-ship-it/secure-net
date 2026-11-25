const usuarioService = require("../services/usuario.service");
const { serializeUsuario } = require("../utils/serializers");

function containsClaveHash(payload) {
  return JSON.stringify(payload).includes("clave_hash");
}

function sendUsuario(res, statusCode, message, usuario) {
  const data = serializeUsuario(usuario);

  if (containsClaveHash(data)) {
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
    const usuarios = await usuarioService.listUsuarios();
    const data = usuarios.map(serializeUsuario);

    if (containsClaveHash(data)) {
      throw new Error("La respuesta no debe incluir clave_hash.");
    }

    return res.json({
      success: true,
      message: "Usuarios obtenidos correctamente.",
      data
    });
  } catch (error) {
    return next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const usuario = await usuarioService.getUsuarioById(req.params.id);
    return sendUsuario(res, 200, "Usuario obtenido correctamente.", usuario);
  } catch (error) {
    return next(error);
  }
}

async function crear(req, res, next) {
  try {
    const usuario = await usuarioService.createUsuario(req.body);
    return sendUsuario(res, 201, "Usuario creado correctamente.", usuario);
  } catch (error) {
    return next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const usuario = await usuarioService.updateUsuario(req.params.id, req.body);
    return sendUsuario(res, 200, "Usuario actualizado correctamente.", usuario);
  } catch (error) {
    return next(error);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const usuario = await usuarioService.setUsuarioActivo(req.params.id, req.body.activo);
    return sendUsuario(res, 200, "Estado del usuario actualizado correctamente.", usuario);
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
