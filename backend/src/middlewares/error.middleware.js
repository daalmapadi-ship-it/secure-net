const { env } = require("../config/env");

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada."
  });
}

function mapDatabaseError(error) {
  if (error.statusCode) {
    return error;
  }

  const code = error.code;
  const errno = error.errno;

  if (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "PROTOCOL_CONNECTION_LOST" ||
    code === "HANDSHAKE_SSL_ERROR" ||
    code === "ECONNRESET"
  ) {
    error.statusCode = 503;
    error.message = "No fue posible conectar con la base de datos.";
    return error;
  }

  if (code === "ER_ACCESS_DENIED_ERROR" || errno === 1045) {
    error.statusCode = 503;
    error.message = "La autenticación con la base de datos fue rechazada.";
    return error;
  }

  if (code === "ER_BAD_DB_ERROR" || errno === 1049) {
    error.statusCode = 503;
    error.message = "La base de datos configurada no existe.";
    return error;
  }

  if (code === "ER_NO_DEFAULT_FOR_FIELD" || errno === 1364) {
    error.statusCode = 500;
    error.message = "No se pudo generar el identificador del registro.";
    return error;
  }

  if (code === "ER_NO_REFERENCED_ROW_2" || code === "ER_NO_REFERENCED_ROW" || errno === 1452) {
    error.statusCode = 400;
    error.message = "La referencia indicada no existe.";
    return error;
  }

  if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED" || errno === 1451) {
    error.statusCode = 409;
    error.message = "No se puede eliminar el registro porque está en uso.";
    return error;
  }

  if (code === "ER_DUP_ENTRY" || errno === 1062) {
    error.statusCode = 409;
    error.message = "Ya existe un registro con esos datos.";
    return error;
  }

  if (code === "ER_DATA_TOO_LONG" || errno === 1406) {
    error.statusCode = 400;
    error.message = "Uno de los campos excede la longitud permitida.";
    return error;
  }

  if (code === "ER_TRUNCATED_WRONG_VALUE" || code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
    error.statusCode = 400;
    error.message = "Uno de los valores enviados no es válido para la base de datos.";
    return error;
  }

  return error;
}

function errorHandler(error, req, res, _next) {
  const mapped = mapDatabaseError(error);
  const statusCode = mapped.statusCode || 500;

  if (statusCode >= 500) {
    console.error(mapped);
  }

  const publicMessage =
    statusCode >= 500 && env.NODE_ENV === "production"
      ? "Error interno del servidor."
      : mapped.message || "Error interno del servidor.";

  res.status(statusCode).json({
    success: false,
    message: publicMessage
  });
}

module.exports = { notFoundHandler, errorHandler };
