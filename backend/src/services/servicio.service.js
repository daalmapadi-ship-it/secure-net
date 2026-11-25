const { pool } = require("../config/db");
const { HttpError } = require("../utils/httpError");
const categoriaService = require("./categoria.service");

const SERVICIO_SELECT = `
  SELECT
    s.id_servicio,
    s.id_categoria,
    s.nombre,
    s.descripcion,
    s.precio_base,
    s.activo,
    c.nombre AS nombre_categoria
  FROM servicios s
  INNER JOIN categorias_servicio c ON s.id_categoria = c.id_categoria
`;

function parseId(value, fieldName) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${fieldName} no es válido.`);
  }

  return id;
}

function requiredNombre(value) {
  const nombre = String(value || "").trim();

  if (!nombre) {
    throw new HttpError(400, "El nombre es obligatorio.");
  }

  if (nombre.length > 100) {
    throw new HttpError(400, "El nombre no puede superar 100 caracteres.");
  }

  return nombre;
}

function optionalDescripcion(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const descripcion = String(value).trim();
  return descripcion === "" ? null : descripcion;
}

function parsePrecio(value, required) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new HttpError(400, "precio_base es obligatorio.");
    }
    return undefined;
  }

  const precio = Number(value);

  if (!Number.isFinite(precio)) {
    throw new HttpError(400, "precio_base debe ser numérico.");
  }

  if (precio < 0) {
    throw new HttpError(400, "precio_base no puede ser negativo.");
  }

  return Number(precio.toFixed(2));
}

async function findById(idServicio) {
  const [rows] = await pool.query(`${SERVICIO_SELECT} WHERE s.id_servicio = ?`, [idServicio]);
  return rows[0] || null;
}

async function listServicios() {
  const [rows] = await pool.query(`${SERVICIO_SELECT} ORDER BY s.id_servicio ASC`);
  return rows;
}

async function getServicioById(id) {
  const idServicio = parseId(id, "id");
  const servicio = await findById(idServicio);

  if (!servicio) {
    throw new HttpError(404, "Servicio no encontrado.");
  }

  return servicio;
}

async function ensureCategoriaExiste(idCategoria) {
  const categoria = await categoriaService.findById(idCategoria);

  if (!categoria) {
    throw new HttpError(400, "La categoría indicada no existe.");
  }

  return categoria;
}

async function createServicio(payload) {
  const idCategoria = parseId(payload.id_categoria, "id_categoria");
  const nombre = requiredNombre(payload.nombre);
  const descripcion = optionalDescripcion(payload.descripcion);
  const precioBase = parsePrecio(payload.precio_base, true);

  await ensureCategoriaExiste(idCategoria);

  const [result] = await pool.query(
    `INSERT INTO servicios (id_categoria, nombre, descripcion, precio_base, activo)
     VALUES (?, ?, ?, ?, 1)`,
    [idCategoria, nombre, descripcion, precioBase]
  );

  return findById(result.insertId);
}

async function updateServicio(id, payload) {
  const idServicio = parseId(id, "id");
  const actual = await findById(idServicio);

  if (!actual) {
    throw new HttpError(404, "Servicio no encontrado.");
  }

  const idCategoria =
    payload.id_categoria !== undefined
      ? parseId(payload.id_categoria, "id_categoria")
      : actual.id_categoria;
  const nombre =
    payload.nombre !== undefined ? requiredNombre(payload.nombre) : actual.nombre;
  const descripcion =
    payload.descripcion !== undefined
      ? optionalDescripcion(payload.descripcion)
      : actual.descripcion;
  const precioBase =
    payload.precio_base !== undefined
      ? parsePrecio(payload.precio_base, true)
      : Number(actual.precio_base);

  if (idCategoria !== actual.id_categoria) {
    await ensureCategoriaExiste(idCategoria);
  }

  await pool.query(
    `UPDATE servicios
     SET id_categoria = ?, nombre = ?, descripcion = ?, precio_base = ?
     WHERE id_servicio = ?`,
    [idCategoria, nombre, descripcion, precioBase, idServicio]
  );

  return findById(idServicio);
}

async function setServicioActivo(id, activo) {
  const idServicio = parseId(id, "id");

  if (typeof activo !== "boolean" && activo !== 0 && activo !== 1) {
    throw new HttpError(400, "El campo activo debe ser true o false.");
  }

  const actual = await findById(idServicio);
  if (!actual) {
    throw new HttpError(404, "Servicio no encontrado.");
  }

  const valorActivo = activo === true || activo === 1 ? 1 : 0;

  await pool.query("UPDATE servicios SET activo = ? WHERE id_servicio = ?", [
    valorActivo,
    idServicio
  ]);

  return findById(idServicio);
}

module.exports = {
  listServicios,
  getServicioById,
  createServicio,
  updateServicio,
  setServicioActivo
};
