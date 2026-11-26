/**
 * Utilidad para exportar listados de Secure Net a archivos CSV compatibles con Excel.
 *
 * - Usa punto y coma (;) como separador, que es el que Excel espera en
 *   configuraciones regionales en español (Colombia).
 * - Agrega BOM UTF-8 para que Excel muestre correctamente tildes y la letra ñ.
 * - Neutraliza valores que empiezan por =, +, -, @ para evitar inyección de
 *   fórmulas al abrir el archivo en una hoja de cálculo.
 */

const SEPARATOR = ";";
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (typeof value === "number") {
    return String(value);
  }

  const text = String(value);
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

function escapeCell(value) {
  const text = normalizeValue(value);

  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildFileName(baseName) {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;

  return `${baseName}_${stamp}.csv`;
}

/**
 * Genera y descarga un archivo CSV.
 *
 * @param {string} baseName Nombre base del archivo (sin extensión).
 * @param {Array<{ header: string, value: (row: object) => unknown }>} columns
 *        Definición de columnas: encabezado y función que obtiene el valor de cada fila.
 * @param {Array<object>} rows Registros a exportar.
 * @returns {boolean} true si se generó el archivo; false si no había registros.
 */
export function exportToCsv(baseName, columns, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return false;
  }

  const headerLine = columns.map((column) => escapeCell(column.header)).join(SEPARATOR);
  const dataLines = rows.map((row) =>
    columns.map((column) => escapeCell(column.value(row))).join(SEPARATOR)
  );

  const content = `\uFEFF${[headerLine, ...dataLines].join("\r\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = buildFileName(baseName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

/**
 * Une nombres y apellidos de una persona (cliente o usuario).
 */
export function fullName(item) {
  return [item?.nombres, item?.apellidos].filter(Boolean).join(" ").trim();
}