const usuarioService = require("../services/usuario.service");
const { signToken } = require("../utils/jwt");
const { serializeUsuario, serializeRol } = require("../utils/serializers");

async function login(req, res, next) {
  try {
    const usuario = await usuarioService.login(req.body.correo, req.body.clave);
    const token = signToken(usuario);
    const usuarioPublico = serializeUsuario(usuario);

    return res.json({
      success: true,
      message: "Inicio de sesión exitoso.",
      data: {
        token,
        usuario: usuarioPublico,
        rol: serializeRol(usuario)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const usuario = await usuarioService.findById(req.user.sub);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "El usuario autenticado no existe."
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: "El usuario está inactivo."
      });
    }

    const usuarioPublico = serializeUsuario(usuario);

    return res.json({
      success: true,
      message: "Usuario autenticado.",
      data: {
        usuario: usuarioPublico,
        rol: serializeRol(usuario)
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login, me };
