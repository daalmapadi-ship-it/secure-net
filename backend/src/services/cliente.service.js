const { pool } = require("../config/db");
const { HttpError } = require("../utils/httpError");
const { insertAndGetId } = require("../utils/insert");
const { isValidEmail } = require("../middlewares/validate.middleware");

const CLIENTE_SELECT = `
  SELECT
    id_cliente,
    tipo_doc,
    num_doc,
    razon_social,
    nombres,
    apellidos,
    correo,
    telefono,
    direccion,
    ciudad,
    activo,
    creado_en
  FROM clientes
`;

function parseId(value, fieldName) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${fieldName} no es válido.`);
  }

  return id;
}

function optionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text === "" ? null : text;
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

function normalizeCorreo(value) {
  const correo = optionalText(value);

  if (!correo) {
    return null;
  }

  if (!isValidEmail(correo) || correo.length > 120) {
    throw new HttpError(400, "El correo no tiene un formato válido.");
  }

  return correo.toLowerCase();
}

function normalizeTipoDoc(value) {
  const tipoDoc = requiredText(value, "tipo_doc", 5).toUpperCase();
  return tipoDoc;
}

async function findById(idCliente) {
  const [rows] = await pool.query(`${CLIENTE_SELECT} WHERE id_cliente = ?`, [idCliente]);
  return rows[0] || null;
}

async function findByNumDoc(numDoc) {
  const [rows] = await pool.query(`${CLIENTE_SELECT} WHERE num_doc = ?`, [numDoc]);
  return rows[0] || null;
}

async function listClientes() {
  const [rows] = await pool.query(`${CLIENTE_SELECT} ORDER BY id_cliente ASC`);
  return rows;
}

async function getClienteById(id) {
  const idCliente = parseId(id, "id");
  const cliente = await findById(idCliente);

  if (!cliente) {
    throw new HttpError(404, "Cliente no encontrado.");
  }

  return cliente;
}

async function createCliente(payload) {
  const tipoDoc = normalizeTipoDoc(payload.tipo_doc);
  const numDoc = requiredText(payload.num_doc, "num_doc", 20);
  const nombres = requiredText(payload.nombres, "nombres", 80);
  const apellidos = requiredText(payload.apellidos, "apellidos", 80);
  const razonSocial = optionalText(payload.razon_social);
  const correo = normalizeCorreo(payload.correo);
  const telefono = optionalText(payload.telefono);
  const direccion = optionalText(payload.direccion);
  const ciudad = optionalText(payload.ciudad);

  if (razonSocial && razonSocial.length > 150) {
    throw new HttpError(400, "razon_social no puede superar 150 caracteres.");
  }

  if (telefono && telefono.length > 20) {
    throw new HttpError(400, "telefono no puede superar 20 caracteres.");
  }

  if (direccion && direccion.length > 200) {
    throw new HttpError(400, "direccion no puede superar 200 caracteres.");
  }

  if (ciudad && ciudad.length > 60) {
    throw new HttpError(400, "ciudad no puede superar 60 caracteres.");
  }

  const existente = await findByNumDoc(numDoc);
  if (existente) {
    throw new HttpError(409, "Ya existe un cliente con este número de documento.");
  }

  try {
    const idCliente = await insertAndGetId({
      table: "clientes",
      idColumn: "id_cliente",
      columns: [
        "tipo_doc",
        "num_doc",
        "razon_social",
        "nombres",
        "apellidos",
        "correo",
        "telefono",
        "direccion",
        "ciudad",
        "activo"
      ],
      values: [tipoDoc, numDoc, razonSocial, nombres, apellidos, correo, telefono, direccion, ciudad, 1]
    });

    return findById(idCliente);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new HttpError(409, "Ya existe un cliente con este número de documento.");
    }
    throw error;
  }
}

async function updateCliente(id, payload) {
  const idCliente = parseId(id, "id");
  const actual = await findById(idCliente);

  if (!actual) {
    throw new HttpError(404, "Cliente no encontrado.");
  }

  const tipoDoc =
    payload.tipo_doc !== undefined ? normalizeTipoDoc(payload.tipo_doc) : actual.tipo_doc;
  const numDoc =
    payload.num_doc !== undefined ? requiredText(payload.num_doc, "num_doc", 20) : actual.num_doc;
  const nombres =
    payload.nombres !== undefined ? requiredText(payload.nombres, "nombres", 80) : actual.nombres;
  const apellidos =
    payload.apellidos !== undefined
      ? requiredText(payload.apellidos, "apellidos", 80)
      : actual.apellidos;
  const razonSocial =
    payload.razon_social !== undefined ? optionalText(payload.razon_social) : actual.razon_social;
  const correo = payload.correo !== undefined ? normalizeCorreo(payload.correo) : actual.correo;
  const telefono = payload.telefono !== undefined ? optionalText(payload.telefono) : actual.telefono;
  const direccion =
    payload.direccion !== undefined ? optionalText(payload.direccion) : actual.direccion;
  const ciudad = payload.ciudad !== undefined ? optionalText(payload.ciudad) : actual.ciudad;

  if (razonSocial && razonSocial.length > 150) {
    throw new HttpError(400, "razon_social no puede superar 150 caracteres.");
  }

  if (telefono && telefono.length > 20) {
    throw new HttpError(400, "telefono no puede superar 20 caracteres.");
  }

  if (direccion && direccion.length > 200) {
    throw new HttpError(400, "direccion no puede superar 200 caracteres.");
  }

  if (ciudad && ciudad.length > 60) {
    throw new HttpError(400, "ciudad no puede superar 60 caracteres.");
  }

  if (numDoc !== actual.num_doc) {
    const existente = await findByNumDoc(numDoc);
    if (existente && existente.id_cliente !== idCliente) {
      throw new HttpError(409, "Ya existe un cliente con este número de documento.");
    }
  }

  try {
    await pool.query(
      `UPDATE clientes
       SET tipo_doc = ?, num_doc = ?, razon_social = ?, nombres = ?, apellidos = ?,
           correo = ?, telefono = ?, direccion = ?, ciudad = ?
       WHERE id_cliente = ?`,
      [
        tipoDoc,
        numDoc,
        razonSocial,
        nombres,
        apellidos,
        correo,
        telefono,
        direccion,
        ciudad,
        idCliente
      ]
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new HttpError(409, "Ya existe un cliente con este número de documento.");
    }
    throw error;
  }

  return findById(idCliente);
}

async function setClienteActivo(id, activo) {
  const idCliente = parseId(id, "id");

  if (typeof activo !== "boolean" && activo !== 0 && activo !== 1) {
    throw new HttpError(400, "El campo activo debe ser true o false.");
  }

  const actual = await findById(idCliente);
  if (!actual) {
    throw new HttpError(404, "Cliente no encontrado.");
  }

  const valorActivo = activo === true || activo === 1 ? 1 : 0;

  await pool.query("UPDATE clientes SET activo = ? WHERE id_cliente = ?", [
    valorActivo,
    idCliente
  ]);

  return findById(idCliente);
}

module.exports = {
  listClientes,
  getClienteById,
  createCliente,
  updateCliente,
  setClienteActivo
};
