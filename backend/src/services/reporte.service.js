const { pool } = require("../config/db");
const { HttpError } = require("../utils/httpError");

const REPORTE_SELECT = `
  SELECT
    r.id_reporte,
    r.id_usuario,
    r.tipo,
    r.titulo,
    r.parametros,
    r.generado_en,
    u.nombres AS usuario_nombres,
    u.apellidos AS usuario_apellidos,
    u.correo AS usuario_correo,
    rol.nombre_rol
  FROM reportes r
  INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
  INNER JOIN roles rol ON u.id_rol = rol.id_rol
`;

function parseId(value, fieldName) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${fieldName} no es válido.`);
  }

  return id;
}

function requiredText(value, fieldName, maxLength) {
  const text = String(value || "").trim();

  if (!text) {
    throw new HttpError(400, `${fieldName} es obligatorio.`);
  }

  if (text.length > maxLength) {
    throw new HttpError(400, `${fieldName} no puede superar ${maxLength} caracteres.`);
  }

  return text;
}

function optionalParametros(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text === "" ? null : text;
}

async function ensureUsuarioActivo(idUsuario) {
  const [rows] = await pool.query(
    "SELECT id_usuario, activo FROM usuarios WHERE id_usuario = ?",
    [idUsuario]
  );

  if (!rows[0]) {
    throw new HttpError(400, "El usuario indicado no existe.");
  }

  if (!rows[0].activo) {
    throw new HttpError(400, "El usuario indicado no está activo.");
  }
}

async function findById(idReporte) {
  const [rows] = await pool.query(`${REPORTE_SELECT} WHERE r.id_reporte = ?`, [idReporte]);
  return rows[0] || null;
}

async function listReportes(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.id_usuario) {
    conditions.push("r.id_usuario = ?");
    params.push(parseId(filters.id_usuario, "id_usuario"));
  }

  if (filters.tipo) {
    conditions.push("r.tipo = ?");
    params.push(String(filters.tipo).trim());
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `${REPORTE_SELECT}${where} ORDER BY r.id_reporte ASC`,
    params
  );

  return rows;
}

async function getReporteById(id) {
  const idReporte = parseId(id, "id");
  const reporte = await findById(idReporte);

  if (!reporte) {
    throw new HttpError(404, "Reporte no encontrado.");
  }

  return reporte;
}

async function createReporte(payload, idUsuarioGenerador) {
  const idUsuario = parseId(idUsuarioGenerador, "id_usuario");
  const tipo = requiredText(payload.tipo, "tipo", 30);
  const titulo = requiredText(payload.titulo, "titulo", 150);
  const parametros = optionalParametros(payload.parametros);

  await ensureUsuarioActivo(idUsuario);

  try {
    const [result] = await pool.query(
      `INSERT INTO reportes (id_usuario, tipo, titulo, parametros)
       VALUES (?, ?, ?, ?)`,
      [idUsuario, tipo, titulo, parametros]
    );

    return findById(result.insertId);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      throw new HttpError(400, "El usuario indicado no existe.");
    }
    throw error;
  }
}

module.exports = {
  listReportes,
  getReporteById,
  createReporte
};
