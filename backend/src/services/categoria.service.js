const { pool } = require("../config/db");
const { HttpError } = require("../utils/httpError");
const { insertAndGetId } = require("../utils/insert");

const CATEGORIA_SELECT = `
  SELECT id_categoria, nombre, descripcion
  FROM categorias_servicio
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

  if (nombre.length > 80) {
    throw new HttpError(400, "El nombre no puede superar 80 caracteres.");
  }

  return nombre;
}

function optionalDescripcion(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const descripcion = String(value).trim();

  if (descripcion === "") {
    return null;
  }

  if (descripcion.length > 200) {
    throw new HttpError(400, "La descripción no puede superar 200 caracteres.");
  }

  return descripcion;
}

async function findById(idCategoria) {
  const [rows] = await pool.query(`${CATEGORIA_SELECT} WHERE id_categoria = ?`, [idCategoria]);
  return rows[0] || null;
}

async function findByNombre(nombre, excludeId) {
  const params = [nombre];
  let sql = `${CATEGORIA_SELECT} WHERE LOWER(nombre) = LOWER(?)`;

  if (excludeId) {
    sql += " AND id_categoria <> ?";
    params.push(excludeId);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function countServiciosByCategoria(idCategoria) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM servicios WHERE id_categoria = ?",
    [idCategoria]
  );
  return Number(rows[0].total);
}

async function listCategorias() {
  const [rows] = await pool.query(`${CATEGORIA_SELECT} ORDER BY id_categoria ASC`);
  return rows;
}

async function getCategoriaById(id) {
  const idCategoria = parseId(id, "id");
  const categoria = await findById(idCategoria);

  if (!categoria) {
    throw new HttpError(404, "Categoría no encontrada.");
  }

  return categoria;
}

async function createCategoria(payload) {
  const nombre = requiredNombre(payload.nombre);
  const descripcion = optionalDescripcion(payload.descripcion);

  const duplicada = await findByNombre(nombre);
  if (duplicada) {
    throw new HttpError(409, "Ya existe una categoría con este nombre.");
  }

  const idCategoria = await insertAndGetId({
    table: "categorias_servicio",
    idColumn: "id_categoria",
    columns: ["nombre", "descripcion"],
    values: [nombre, descripcion]
  });

  return findById(idCategoria);
}

async function updateCategoria(id, payload) {
  const idCategoria = parseId(id, "id");
  const actual = await findById(idCategoria);

  if (!actual) {
    throw new HttpError(404, "Categoría no encontrada.");
  }

  const nombre =
    payload.nombre !== undefined ? requiredNombre(payload.nombre) : actual.nombre;
  const descripcion =
    payload.descripcion !== undefined
      ? optionalDescripcion(payload.descripcion)
      : actual.descripcion;

  const duplicada = await findByNombre(nombre, idCategoria);
  if (duplicada) {
    throw new HttpError(409, "Ya existe una categoría con este nombre.");
  }

  await pool.query(
    "UPDATE categorias_servicio SET nombre = ?, descripcion = ? WHERE id_categoria = ?",
    [nombre, descripcion, idCategoria]
  );

  return findById(idCategoria);
}

async function deleteCategoria(id) {
  const idCategoria = parseId(id, "id");
  const actual = await findById(idCategoria);

  if (!actual) {
    throw new HttpError(404, "Categoría no encontrada.");
  }

  const relacionados = await countServiciosByCategoria(idCategoria);
  if (relacionados > 0) {
    throw new HttpError(
      409,
      `No se puede eliminar la categoría porque tiene ${relacionados} servicio(s) relacionado(s).`
    );
  }

  await pool.query("DELETE FROM categorias_servicio WHERE id_categoria = ?", [idCategoria]);
  return actual;
}

module.exports = {
  listCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  findById
};
