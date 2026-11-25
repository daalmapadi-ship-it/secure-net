const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id_usuario,
      correo: user.correo,
      id_rol: user.id_rol,
      rol: user.nombre_rol
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
