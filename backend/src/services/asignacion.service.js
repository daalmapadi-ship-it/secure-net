const { pool } = require("../config/db");
const { HttpError } = require("../utils/httpError");
const { insertAndGetId } = require("../utils/insert");

const ESTADOS_PERMITIDOS = ["activo", "finalizado"];

const ASIGNACION_SELECT = `
  SELECT
    a.id_asignacion,
    a.id_cliente,
    a.id_servicio,
    a.id_usuario,
    a.fecha_inicio,
    a.fecha_fin,
    a.estado,
    a.observaciones,
    a.creado_en,
    c.nombres AS cliente_nombres,
    c.apellidos AS cliente_apellidos,
    c.razon_social,
    c.num_doc,
    s.nombre AS servicio_nombre,
    s.precio_base,
    u.nombres AS usuario_nombres,
    u.apellidos AS usuario_apellidos,
    u.correo AS usuario_correo
  FROM asignaciones a
  INNER JOIN clientes c ON a.id_cliente = c.id_cliente
  INNER JOIN servicios s ON a.id_servicio = s.id_servicio
  INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
`;

function parseId(value, fieldName) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${fieldName} no es válido.`);
  }

  return id;
}

function toDateString(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

function parseDate(value, fieldName, required) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new HttpError(400, `${fieldName} es obligatorio.`);
    }
    return null;
  }

  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new HttpError(400, `${fieldName} debe tener el formato YYYY-MM-DD.`);
  }

  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${fieldName} no es una fecha válida.`);
  }

  return text;
}

function parseEstado(value) {
  const estado = String(value || "").trim().toLowerCase();

  if (!ESTADOS_PERMITIDOS.includes(estado)) {
    throw new HttpError(
      400,
      `estado debe ser uno de: ${ESTADOS_PERMITIDOS.join(", ")}.`
    );
  }

  return estado;
}

function optionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text === "" ? null : text;
}

function ensureFechasCoherentes(fechaInicio, fechaFin) {
  if (fechaFin && fechaFin < fechaInicio) {
    throw new HttpError(400, "fecha_fin no puede ser anterior a fecha_inicio.");
  }
}

async function findById(idAsignacion) {
  const [rows] = await pool.query(`${ASIGNACION_SELECT} WHERE a.id_asignacion = ?`, [
    idAsignacion
  ]);
  return rows[0] || null;
}

async function findActivaDuplicada(idCliente, idServicio, excludeId) {
  const params = [idCliente, idServicio];
  let sql = `
    SELECT id_asignacion
    FROM asignaciones
    WHERE id_cliente = ? AND id_servicio = ? AND estado = 'activo'
  `;

  if (excludeId) {
    sql += " AND id_asignacion <> ?";
    params.push(excludeId);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function ensureClienteActivo(idCliente) {
  const [rows] = await pool.query(
    "SELECT id_cliente, activo FROM clientes WHERE id_cliente = ?",
    [idCliente]
  );

  if (!rows[0]) {
    throw new HttpError(400, "El cliente indicado no existe.");
  }

  if (!rows[0].activo) {
    throw new HttpError(400, "El cliente indicado no está activo.");
  }
}

async function ensureServicioActivo(idServicio) {
  const [rows] = await pool.query(
    "SELECT id_servicio, activo FROM servicios WHERE id_servicio = ?",
    [idServicio]
  );

  if (!rows[0]) {
    throw new HttpError(400, "El servicio indicado no existe.");
  }

  if (!rows[0].activo) {
    throw new HttpError(400, "El servicio indicado no está activo.");
  }
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

async function listAsignaciones() {
  const [rows] = await pool.query(`${ASIGNACION_SELECT} ORDER BY a.id_asignacion ASC`);
  return rows;
}

async function getAsignacionById(id) {
  const idAsignacion = parseId(id, "id");
  const asignacion = await findById(idAsignacion);

  if (!asignacion) {
    throw new HttpError(404, "Asignación no encontrada.");
  }

  return asignacion;
}

async function createAsignacion(payload) {
  const idCliente = parseId(payload.id_cliente, "id_cliente");
  const idServicio = parseId(payload.id_servicio, "id_servicio");
  const idUsuario = parseId(payload.id_usuario, "id_usuario");
  const fechaInicio = parseDate(payload.fecha_inicio, "fecha_inicio", true);
  const fechaFin = parseDate(payload.fecha_fin, "fecha_fin", false);
  const observaciones = optionalText(payload.observaciones);
  const estado = payload.estado !== undefined ? parseEstado(payload.estado) : "activo";

  ensureFechasCoherentes(fechaInicio, fechaFin);

  await ensureClienteActivo(idCliente);
  await ensureServicioActivo(idServicio);
  await ensureUsuarioActivo(idUsuario);

  if (estado === "activo") {
    const duplicada = await findActivaDuplicada(idCliente, idServicio);
    if (duplicada) {
      throw new HttpError(
        409,
        "Ya existe una asignación activa de este servicio para el cliente."
      );
    }
  }

  try {
    const idAsignacion = await insertAndGetId({
      table: "asignaciones",
      idColumn: "id_asignacion",
      columns: [
        "id_cliente",
        "id_servicio",
        "id_usuario",
        "fecha_inicio",
        "fecha_fin",
        "estado",
        "observaciones"
      ],
      values: [idCliente, idServicio, idUsuario, fechaInicio, fechaFin, estado, observaciones]
    });

    return findById(idAsignacion);
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      throw new HttpError(400, "El cliente, servicio o usuario indicado no existe.");
    }
    throw error;
  }
}

async function updateAsignacion(id, payload) {
  const idAsignacion = parseId(id, "id");
  const actual = await findById(idAsignacion);

  if (!actual) {
    throw new HttpError(404, "Asignación no encontrada.");
  }

  const idCliente =
    payload.id_cliente !== undefined
      ? parseId(payload.id_cliente, "id_cliente")
      : actual.id_cliente;
  const idServicio =
    payload.id_servicio !== undefined
      ? parseId(payload.id_servicio, "id_servicio")
      : actual.id_servicio;
  const idUsuario =
    payload.id_usuario !== undefined
      ? parseId(payload.id_usuario, "id_usuario")
      : actual.id_usuario;
  const fechaInicio =
    payload.fecha_inicio !== undefined
      ? parseDate(payload.fecha_inicio, "fecha_inicio", true)
      : toDateString(actual.fecha_inicio);
  const fechaFin =
    payload.fecha_fin !== undefined
      ? parseDate(payload.fecha_fin, "fecha_fin", false)
      : toDateString(actual.fecha_fin);
  const observaciones =
    payload.observaciones !== undefined
      ? optionalText(payload.observaciones)
      : actual.observaciones;
  const estado =
    payload.estado !== undefined ? parseEstado(payload.estado) : actual.estado;

  ensureFechasCoherentes(fechaInicio, fechaFin);

  if (idCliente !== actual.id_cliente) {
    await ensureClienteActivo(idCliente);
  }

  if (idServicio !== actual.id_servicio) {
    await ensureServicioActivo(idServicio);
  }

  if (idUsuario !== actual.id_usuario) {
    await ensureUsuarioActivo(idUsuario);
  }

  if (estado === "activo") {
    const duplicada = await findActivaDuplicada(idCliente, idServicio, idAsignacion);
    if (duplicada) {
      throw new HttpError(
        409,
        "Ya existe una asignación activa de este servicio para el cliente."
      );
    }
  }

  try {
    await pool.query(
      `UPDATE asignaciones
       SET id_cliente = ?, id_servicio = ?, id_usuario = ?, fecha_inicio = ?,
           fecha_fin = ?, estado = ?, observaciones = ?
       WHERE id_asignacion = ?`,
      [
        idCliente,
        idServicio,
        idUsuario,
        fechaInicio,
        fechaFin,
        estado,
        observaciones,
        idAsignacion
      ]
    );
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      throw new HttpError(400, "El cliente, servicio o usuario indicado no existe.");
    }
    throw error;
  }

  return findById(idAsignacion);
}

async function setAsignacionEstado(id, estado) {
  const idAsignacion = parseId(id, "id");
  const actual = await findById(idAsignacion);

  if (!actual) {
    throw new HttpError(404, "Asignación no encontrada.");
  }

  const nuevoEstado = parseEstado(estado);

  await pool.query("UPDATE asignaciones SET estado = ? WHERE id_asignacion = ?", [
    nuevoEstado,
    idAsignacion
  ]);

  return findById(idAsignacion);
}

module.exports = {
  listAsignaciones,
  getAsignacionById,
  createAsignacion,
  updateAsignacion,
  setAsignacionEstado
};
