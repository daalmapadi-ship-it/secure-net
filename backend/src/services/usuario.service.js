const { pool } = require("../config/db");
const { HttpError } = require("../utils/httpError");
const { hashPassword, comparePassword } = require("../utils/password");
const { isValidEmail } = require("../middlewares/validate.middleware");

const USER_SELECT = `
  SELECT
    u.id_usuario,
    u.id_rol,
    u.nombres,
    u.apellidos,
    u.correo,
    u.clave_hash,
    u.activo,
    u.creado_en,
    r.nombre_rol,
    r.descripcion AS descripcion_rol,
    r.activo AS rol_activo
  FROM usuarios u
  INNER JOIN roles r ON r.id_rol = u.id_rol
`;

function parseId(value, fieldName) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${fieldName} no es válido.`);
  }

  return id;
}

async function findRolById(idRol) {
  const [rows] = await pool.query(
    "SELECT id_rol, nombre_rol, descripcion, activo FROM roles WHERE id_rol = ?",
    [idRol]
  );

  return rows[0] || null;
}

async function findByCorreo(correo) {
  const [rows] = await pool.query(`${USER_SELECT} WHERE u.correo = ?`, [correo]);
  return rows[0] || null;
}

async function findById(idUsuario) {
  const [rows] = await pool.query(`${USER_SELECT} WHERE u.id_usuario = ?`, [idUsuario]);
  return rows[0] || null;
}

async function listUsuarios() {
  const [rows] = await pool.query(`${USER_SELECT} ORDER BY u.id_usuario ASC`);
  return rows;
}

async function getUsuarioById(id) {
  const idUsuario = parseId(id, "id");
  const usuario = await findById(idUsuario);

  if (!usuario) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  return usuario;
}

async function ensureRolDisponible(idRol) {
  const rol = await findRolById(idRol);

  if (!rol) {
    throw new HttpError(400, "El rol indicado no existe.");
  }

  if (!rol.activo) {
    throw new HttpError(400, "El rol indicado no está activo.");
  }

  return rol;
}

async function createUsuario(payload) {
  const nombres = String(payload.nombres || "").trim();
  const apellidos = String(payload.apellidos || "").trim();
  const correo = String(payload.correo || "").trim().toLowerCase();
  const clave = payload.clave;
  const idRol = parseId(payload.id_rol, "id_rol");

  if (!nombres) {
    throw new HttpError(400, "Los nombres son obligatorios.");
  }

  if (!apellidos) {
    throw new HttpError(400, "Los apellidos son obligatorios.");
  }

  if (!correo) {
    throw new HttpError(400, "El correo es obligatorio.");
  }

  if (!isValidEmail(correo)) {
    throw new HttpError(400, "El correo no tiene un formato válido.");
  }

  if (!clave || String(clave).trim() === "") {
    throw new HttpError(400, "La contraseña es obligatoria al crear un usuario.");
  }

  await ensureRolDisponible(idRol);

  const existente = await findByCorreo(correo);
  if (existente) {
    throw new HttpError(409, "Ya existe un usuario con este correo.");
  }

  const claveHash = await hashPassword(clave);

  try {
    const [result] = await pool.query(
      `INSERT INTO usuarios (id_rol, nombres, apellidos, correo, clave_hash, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [idRol, nombres, apellidos, correo, claveHash]
    );

    return findById(result.insertId);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new HttpError(409, "Ya existe un usuario con este correo.");
    }
    throw error;
  }
}

async function updateUsuario(id, payload) {
  const idUsuario = parseId(id, "id");
  const actual = await findById(idUsuario);

  if (!actual) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const nombres =
    payload.nombres !== undefined ? String(payload.nombres).trim() : actual.nombres;
  const apellidos =
    payload.apellidos !== undefined ? String(payload.apellidos).trim() : actual.apellidos;
  const correo =
    payload.correo !== undefined
      ? String(payload.correo).trim().toLowerCase()
      : actual.correo;
  const idRol =
    payload.id_rol !== undefined ? parseId(payload.id_rol, "id_rol") : actual.id_rol;

  if (!nombres) {
    throw new HttpError(400, "Los nombres son obligatorios.");
  }

  if (!apellidos) {
    throw new HttpError(400, "Los apellidos son obligatorios.");
  }

  if (!isValidEmail(correo)) {
    throw new HttpError(400, "El correo no tiene un formato válido.");
  }

  if (idRol !== actual.id_rol) {
    await ensureRolDisponible(idRol);
  }

  if (correo !== actual.correo) {
    const existente = await findByCorreo(correo);
    if (existente && existente.id_usuario !== idUsuario) {
      throw new HttpError(409, "Ya existe un usuario con este correo.");
    }
  }

  let claveHash = actual.clave_hash;
  if (payload.clave !== undefined && String(payload.clave).trim() !== "") {
    claveHash = await hashPassword(payload.clave);
  }

  try {
    await pool.query(
      `UPDATE usuarios
       SET id_rol = ?, nombres = ?, apellidos = ?, correo = ?, clave_hash = ?
       WHERE id_usuario = ?`,
      [idRol, nombres, apellidos, correo, claveHash, idUsuario]
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new HttpError(409, "Ya existe un usuario con este correo.");
    }
    throw error;
  }

  return findById(idUsuario);
}

async function setUsuarioActivo(id, activo) {
  const idUsuario = parseId(id, "id");

  if (typeof activo !== "boolean" && activo !== 0 && activo !== 1) {
    throw new HttpError(400, "El campo activo debe ser true o false.");
  }

  const actual = await findById(idUsuario);
  if (!actual) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const valorActivo = activo === true || activo === 1 ? 1 : 0;

  await pool.query("UPDATE usuarios SET activo = ? WHERE id_usuario = ?", [
    valorActivo,
    idUsuario
  ]);

  return findById(idUsuario);
}

async function login(correo, clave) {
  if (!correo || !clave) {
    throw new HttpError(400, "El correo y la clave son obligatorios.");
  }

  const correoNormalizado = String(correo).trim().toLowerCase();
  const usuario = await findByCorreo(correoNormalizado);

  if (!usuario) {
    throw new HttpError(401, "Credenciales inválidas.");
  }

  if (!usuario.activo) {
    throw new HttpError(403, "El usuario está inactivo.");
  }

  const coincide = await comparePassword(clave, usuario.clave_hash);
  if (!coincide) {
    throw new HttpError(401, "Credenciales inválidas.");
  }

  return usuario;
}

module.exports = {
  listUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  setUsuarioActivo,
  login,
  findById
};
