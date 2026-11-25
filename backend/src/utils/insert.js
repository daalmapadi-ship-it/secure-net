const { pool } = require("../config/db");
const { HttpError } = require("./httpError");

const ALLOWED_TABLES = {
  clientes: "id_cliente",
  usuarios: "id_usuario",
  categorias_servicio: "id_categoria",
  servicios: "id_servicio",
  asignaciones: "id_asignacion",
  reportes: "id_reporte"
};

function toPositiveInt(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const id = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

function isMissingAutoIncrement(error) {
  const message = String(error.message || "");

  return (
    error.code === "ER_NO_DEFAULT_FOR_FIELD" ||
    error.errno === 1364 ||
    (error.code === "ER_DUP_ENTRY" && message.includes("Duplicate entry '0'")) ||
    message.includes("doesn't have a default value")
  );
}

function quoteIdentifier(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error("Identificador SQL no permitido.");
  }

  return `\`${name}\``;
}

async function resolveInsertId(connection, result) {
  const fromPacket = toPositiveInt(result && result.insertId);
  if (fromPacket) {
    return fromPacket;
  }

  const [rows] = await connection.query("SELECT LAST_INSERT_ID() AS id");
  return toPositiveInt(rows[0] && rows[0].id);
}

async function nextExplicitId(connection, table, idColumn) {
  const [rows] = await connection.query(
    `SELECT COALESCE(MAX(${quoteIdentifier(idColumn)}), 0) + 1 AS next_id FROM ${quoteIdentifier(table)}`
  );

  return toPositiveInt(rows[0] && rows[0].next_id) || 1;
}

async function insertWithExplicitId(connection, tableSql, idSql, columnSql, placeholders, values, table, idColumn) {
  const nextId = await nextExplicitId(connection, table, idColumn);
  await connection.query(
    `INSERT INTO ${tableSql} (${idSql}, ${columnSql}) VALUES (?, ${placeholders})`,
    [nextId, ...values]
  );
  return nextId;
}

async function insertAndGetId({ table, idColumn, columns, values }) {
  const expectedIdColumn = ALLOWED_TABLES[table];

  if (!expectedIdColumn || expectedIdColumn !== idColumn) {
    throw new Error("Tabla o columna de identificador no permitida.");
  }

  if (columns.length !== values.length) {
    throw new Error("Las columnas y los valores del INSERT no coinciden.");
  }

  const tableSql = quoteIdentifier(table);
  const idSql = quoteIdentifier(idColumn);
  const columnSql = columns.map(quoteIdentifier).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const insertSql = `INSERT INTO ${tableSql} (${columnSql}) VALUES (${placeholders})`;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    try {
      const [result] = await connection.query(insertSql, values);
      const generatedId = await resolveInsertId(connection, result);

      if (generatedId) {
        await connection.commit();
        return generatedId;
      }

      await connection.rollback();
      await connection.beginTransaction();
      const fallbackId = await insertWithExplicitId(
        connection,
        tableSql,
        idSql,
        columnSql,
        placeholders,
        values,
        table,
        idColumn
      );
      await connection.commit();
      return fallbackId;
    } catch (error) {
      await connection.rollback();

      if (!isMissingAutoIncrement(error)) {
        throw error;
      }

      await connection.beginTransaction();
      const fallbackId = await insertWithExplicitId(
        connection,
        tableSql,
        idSql,
        columnSql,
        placeholders,
        values,
        table,
        idColumn
      );
      await connection.commit();
      return fallbackId;
    }
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_rollbackError) {
      // La transacción puede haber quedado ya cerrada.
    }

    if (isMissingAutoIncrement(error)) {
      throw new HttpError(
        500,
        "No se pudo generar el identificador del registro. La tabla no tiene AUTO_INCREMENT usable en TiDB."
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { insertAndGetId };
