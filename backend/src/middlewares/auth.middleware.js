const { verifyToken } = require("../utils/jwt");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "El token de autenticación es obligatorio."
    });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o vencido."
    });
  }
}

module.exports = { authenticate };
