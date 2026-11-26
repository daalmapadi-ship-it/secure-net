import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { crearReporte, listarReportes, obtenerReporte } from "../services/reporte.service";
import { listarUsuarios } from "../services/usuario.service";
import { exportToCsv, fullName } from "../utils/exportCsv";

const WRITE_ROLES = ["administrador", "supervisor"];

const CSV_COLUMNS = [
  { header: "ID", value: (r) => r.id_reporte },
  { header: "Tipo", value: (r) => r.tipo },
  { header: "Título", value: (r) => r.titulo },
  { header: "Generado por", value: (r) => fullName(r.usuario) || r.usuario?.correo },
  { header: "Rol", value: (r) => r.usuario?.rol },
  { header: "Fecha de generación", value: (r) => r.generado_en },
  { header: "Parámetros", value: (r) => r.parametros }
];
const EMPTY_FILTERS = { id_usuario: "", tipo: "" };
const EMPTY_FORM = { tipo: "", titulo: "", parametros: "" };

function resolveApiMessage(result, fallback) {
  if (result.networkError && !result.payload) {
    return "No fue posible conectar con el servidor. Verifique que el backend de Secure Net esté en ejecución.";
  }

  if (result.payload?.message) {
    return result.payload.message;
  }

  return fallback;
}

function persona(usuario) {
  return [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(" ").trim();
}

function nombreUsuario(usuario) {
  return persona(usuario) || usuario?.correo || "—";
}

function formatFecha(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function presentParametros(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  const text = String(value);
  const trimmed = text.trim();
  const looksJson =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));

  if (!looksJson) {
    return text;
  }

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return text;
  }
}

function previewParametros(value) {
  const text = presentParametros(value);
  if (!text) {
    return "—";
  }

  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 80 ? `${compact.slice(0, 80)}…` : compact;
}

function collectTipos(reportes, current) {
  const tipos = new Set(current);

  reportes.forEach((reporte) => {
    const tipo = String(reporte.tipo || "").trim();
    if (tipo) {
      tipos.add(tipo);
    }
  });

  return [...tipos].sort((left, right) => left.localeCompare(right, "es"));
}

function validateForm(form) {
  const errors = {};
  const tipo = form.tipo.trim();
  const titulo = form.titulo.trim();
  const parametros = form.parametros.trim();

  if (!tipo) {
    errors.tipo = "El tipo es obligatorio.";
  } else if (tipo.length > 30) {
    errors.tipo = "El tipo no puede superar 30 caracteres.";
  }

  if (!titulo) {
    errors.titulo = "El título es obligatorio.";
  } else if (titulo.length > 150) {
    errors.titulo = "El título no puede superar 150 caracteres.";
  }

  if (parametros && (parametros.startsWith("{") || parametros.startsWith("["))) {
    try {
      JSON.parse(parametros);
    } catch {
      errors.parametros = "Los parámetros deben ser texto o un JSON válido.";
    }
  }

  return errors;
}

function buildPayload(form) {
  const payload = {
    tipo: form.tipo.trim(),
    titulo: form.titulo.trim()
  };

  const parametros = form.parametros.trim();
  if (parametros) {
    payload.parametros = parametros;
  }

  return payload;
}

export function ReportesPage() {
  const { rol } = useAuth();
  const canWrite = WRITE_ROLES.includes(String(rol?.nombre_rol || "").toLowerCase());

  const [reportes, setReportes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosError, setUsuariosError] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [notice, setNotice] = useState(null);
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState(null);

  const usuariosOrdenados = useMemo(
    () =>
      [...usuarios].sort((left, right) =>
        nombreUsuario(left).localeCompare(nombreUsuario(right), "es")
      ),
    [usuarios]
  );

  async function loadReportes(filters, { silent = false } = {}) {
    if (!silent) {
      setListLoading(true);
    }
    setListError("");

    const result = await listarReportes(filters);
    if (!result.ok || !result.payload?.success || !Array.isArray(result.payload.data)) {
      setListError(resolveApiMessage(result, "No fue posible obtener los reportes."));
      if (!silent) {
        setReportes([]);
      }
      setListLoading(false);
      return false;
    }

    setReportes(result.payload.data);
    setTipos((current) => collectTipos(result.payload.data, current));
    setListLoading(false);
    return true;
  }

  async function loadUsuarios() {
    const result = await listarUsuarios();
    if (!result.ok || !result.payload?.success || !Array.isArray(result.payload.data)) {
      setUsuarios([]);
      setUsuariosError(resolveApiMessage(result, "No fue posible obtener los usuarios."));
      return;
    }

    setUsuarios(result.payload.data);
    setUsuariosError("");
  }

  useEffect(() => {
    loadReportes(EMPTY_FILTERS);
    loadUsuarios();
  }, []);

  useEffect(() => {
    if (!createOpen && !detailOpen) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === "Escape" && !saving && !detailLoading) {
        setCreateOpen(false);
        setDetailOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createOpen, detailOpen, saving, detailLoading]);

  function updateDraft(name, value) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleFiltrar() {
    const next = {
      id_usuario: draft.id_usuario,
      tipo: draft.tipo.trim()
    };
    setApplied(next);
    setNotice(null);
    loadReportes(next);
  }

  function handleLimpiar() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setNotice(null);
    loadReportes(EMPTY_FILTERS);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setNotice(null);
    setDetailOpen(false);
    setCreateOpen(true);
  }

  async function openDetail(reporte) {
    setDetail(null);
    setDetailError("");
    setCreateOpen(false);
    setDetailOpen(true);
    setDetailLoading(true);

    const result = await obtenerReporte(reporte.id_reporte);
    setDetailLoading(false);

    if (!result.ok || !result.payload?.success || !result.payload.data) {
      setDetailError(resolveApiMessage(result, "No fue posible obtener el reporte."));
      return;
    }

    setDetail(result.payload.data);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSaving(true);
    const result = await crearReporte(buildPayload(form));
    setSaving(false);

    if (!result.ok || !result.payload?.success) {
      setFormError(resolveApiMessage(result, "No fue posible generar el reporte."));
      return;
    }

    setCreateOpen(false);
    setForm(EMPTY_FORM);
    if (result.payload.data?.tipo) {
      setTipos((current) => collectTipos([result.payload.data], current));
    }
    setNotice({
      type: "success",
      text: result.payload.message || "Reporte generado correctamente."
    });
    await loadReportes(applied, { silent: true });
  }

  const parametrosDetalle = presentParametros(detail?.parametros);

  return (
    <section className="sn-module">
      <div className="sn-page-head">
        <div>
          <h1>Reportes</h1>
          <p className="sn-muted">
            {canWrite
              ? "Consulta el historial y genera nuevos reportes de Secure Net."
              : "Consulta el historial de reportes. Tu rol no puede generar registros."}
          </p>
        </div>
        <div className="sn-actions">
          <button
            type="button"
            className="sn-btn sn-btn-ghost"
            onClick={() => exportToCsv("reportes", CSV_COLUMNS, reportes)}
            disabled={listLoading || reportes.length === 0}
          >
            Exportar CSV
          </button>
          {canWrite ? (
            <button type="button" className="sn-btn" onClick={openCreate} disabled={saving || detailLoading}>
              Generar reporte
            </button>
          ) : (
            <span className="sn-cell-sub">Solo consulta</span>
          )}
        </div>
      </div>

      {notice ? (
        <div className={`sn-alert${notice.type === "success" ? " sn-alert-success" : ""}`} role="status">
          {notice.text}
        </div>
      ) : null}

      {listError ? (
        <div className="sn-alert" role="alert">
          {listError}
        </div>
      ) : null}

      <div className="sn-card sn-filters-card">
        <div className="sn-filters">
          <div className="sn-field">
            <label htmlFor="filtro-usuario">Usuario</label>
            <span className="sn-input-shell">
              <select
                id="filtro-usuario"
                className="sn-input-plain"
                value={draft.id_usuario}
                onChange={(event) => updateDraft("id_usuario", event.target.value)}
                disabled={listLoading || usuariosOrdenados.length === 0}
              >
                <option value="">Todos los usuarios</option>
                {usuariosOrdenados.map((usuario) => (
                  <option key={usuario.id_usuario} value={usuario.id_usuario}>
                    {nombreUsuario(usuario)}
                    {usuario.correo ? ` · ${usuario.correo}` : ""}
                  </option>
                ))}
              </select>
            </span>
            {usuariosError ? <span className="sn-field-error">{usuariosError}</span> : null}
          </div>

          <div className="sn-field">
            <label htmlFor="filtro-tipo">Tipo de reporte</label>
            <span className="sn-input-shell">
              <input
                id="filtro-tipo"
                className="sn-input-plain"
                list="tipos-reporte"
                value={draft.tipo}
                onChange={(event) => updateDraft("tipo", event.target.value)}
                placeholder="Todos los tipos"
                disabled={listLoading}
              />
              <datalist id="tipos-reporte">
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo} />
                ))}
              </datalist>
            </span>
          </div>

          <div className="sn-filter-actions">
            <button type="button" className="sn-btn" onClick={handleFiltrar} disabled={listLoading}>
              Filtrar
            </button>
            <button type="button" className="sn-btn sn-btn-ghost" onClick={handleLimpiar} disabled={listLoading}>
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {listLoading || reportes.length > 0 || !listError ? (
        <div className="sn-card sn-table-card">
          {listLoading ? (
            <p className="sn-loading">
              <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
              Cargando reportes...
            </p>
          ) : null}

          {!listLoading && !listError && reportes.length === 0 ? (
            <div className="sn-empty">
              <strong>No hay reportes para esta consulta.</strong>
              <p className="sn-muted">
                {applied.id_usuario || applied.tipo
                  ? "Pruebe con otros filtros o limpie la consulta."
                  : "Cuando se generen reportes, aparecerán en este historial."}
              </p>
            </div>
          ) : null}

          {!listLoading && reportes.length > 0 ? (
            <div className="sn-table-wrap">
              <table className="sn-table sn-table-wide">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Título</th>
                    <th>Usuario</th>
                    <th>Fecha</th>
                    <th>Parámetros</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reportes.map((reporte) => (
                    <tr key={reporte.id_reporte}>
                      <td>{reporte.tipo}</td>
                      <td>
                        <strong>{reporte.titulo}</strong>
                      </td>
                      <td>
                        <strong>{nombreUsuario(reporte.usuario)}</strong>
                        {reporte.usuario?.correo ? (
                          <div className="sn-cell-sub">{reporte.usuario.correo}</div>
                        ) : null}
                        {reporte.usuario?.rol ? <div className="sn-cell-sub">{reporte.usuario.rol}</div> : null}
                      </td>
                      <td>{formatFecha(reporte.generado_en)}</td>
                      <td className="sn-cell-text">{previewParametros(reporte.parametros)}</td>
                      <td>
                        <button
                          type="button"
                          className="sn-btn sn-btn-ghost sn-btn-sm"
                          onClick={() => openDetail(reporte)}
                          disabled={detailLoading || saving}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {createOpen ? (
        <div className="sn-modal-backdrop" onClick={() => !saving && setCreateOpen(false)}>
          <div
            className="sn-card sn-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reporte-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="reporte-form-title">Generar reporte</h2>
            <p className="sn-muted">
              El tipo y el título son obligatorios. El usuario que genera el reporte lo asigna el
              sistema con la sesión actual.
            </p>

            {formError ? (
              <div className="sn-alert" role="alert">
                {formError}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} noValidate>
              <div className="sn-field">
                <label htmlFor="tipo">Tipo</label>
                <span className={`sn-input-shell${fieldErrors.tipo ? " is-invalid" : ""}`}>
                  <input
                    id="tipo"
                    className="sn-input-plain"
                    list="tipos-reporte"
                    value={form.tipo}
                    onChange={(event) => updateField("tipo", event.target.value)}
                    disabled={saving}
                    maxLength={30}
                  />
                </span>
                {fieldErrors.tipo ? <span className="sn-field-error">{fieldErrors.tipo}</span> : null}
              </div>

              <div className="sn-field">
                <label htmlFor="titulo">Título</label>
                <span className={`sn-input-shell${fieldErrors.titulo ? " is-invalid" : ""}`}>
                  <input
                    id="titulo"
                    className="sn-input-plain"
                    value={form.titulo}
                    onChange={(event) => updateField("titulo", event.target.value)}
                    disabled={saving}
                    maxLength={150}
                  />
                </span>
                {fieldErrors.titulo ? <span className="sn-field-error">{fieldErrors.titulo}</span> : null}
              </div>

              <div className="sn-field">
                <label htmlFor="parametros">Parámetros</label>
                <span className={`sn-input-shell${fieldErrors.parametros ? " is-invalid" : ""}`}>
                  <textarea
                    id="parametros"
                    className="sn-input-plain"
                    value={form.parametros}
                    onChange={(event) => updateField("parametros", event.target.value)}
                    disabled={saving}
                    placeholder="Opcional. Texto o JSON."
                  />
                </span>
                {fieldErrors.parametros ? (
                  <span className="sn-field-error">{fieldErrors.parametros}</span>
                ) : null}
              </div>

              <div className="sn-modal-actions">
                <button
                  type="button"
                  className="sn-btn sn-btn-ghost"
                  onClick={() => setCreateOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button className="sn-btn" type="submit" disabled={saving}>
                  {saving ? (
                    <span className="sn-btn-loading">
                      <span className="sn-spinner" aria-hidden="true" />
                      Guardando...
                    </span>
                  ) : (
                    "Generar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {detailOpen ? (
        <div className="sn-modal-backdrop" onClick={() => !detailLoading && setDetailOpen(false)}>
          <div
            className="sn-card sn-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reporte-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="reporte-detail-title">Detalle del reporte</h2>

            {detailError ? (
              <div className="sn-alert" role="alert">
                {detailError}
              </div>
            ) : null}

            {detailLoading ? (
              <p className="sn-loading">
                <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
                Cargando detalle del reporte...
              </p>
            ) : null}

            {!detailLoading && detail ? (
              <div className="sn-detail-grid">
                <div>
                  <span className="sn-detail-label">Tipo</span>
                  <strong>{detail.tipo}</strong>
                </div>
                <div>
                  <span className="sn-detail-label">Título</span>
                  <strong>{detail.titulo}</strong>
                </div>
                <div>
                  <span className="sn-detail-label">Usuario</span>
                  <strong>{nombreUsuario(detail.usuario)}</strong>
                  {detail.usuario?.correo ? <div className="sn-cell-sub">{detail.usuario.correo}</div> : null}
                  {detail.usuario?.rol ? <div className="sn-cell-sub">{detail.usuario.rol}</div> : null}
                </div>
                <div>
                  <span className="sn-detail-label">Fecha</span>
                  <span>{formatFecha(detail.generado_en)}</span>
                </div>
                <div>
                  <span className="sn-detail-label">Parámetros</span>
                  {parametrosDetalle ? <pre className="sn-parametros">{parametrosDetalle}</pre> : <span>—</span>}
                </div>
              </div>
            ) : null}

            <div className="sn-modal-actions">
              <button
                type="button"
                className="sn-btn sn-btn-ghost"
                onClick={() => setDetailOpen(false)}
                disabled={detailLoading}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}