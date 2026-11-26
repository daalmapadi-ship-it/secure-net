import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  actualizarAsignacion,
  cambiarEstadoAsignacion,
  crearAsignacion,
  listarAsignaciones,
  obtenerAsignacion
} from "../services/asignacion.service";
import { listClientes } from "../services/cliente.service";
import { listServicios } from "../services/servicio.service";
import { listarUsuarios } from "../services/usuario.service";
import { exportToCsv, fullName } from "../utils/exportCsv";

const WRITE_ROLES = ["administrador", "supervisor", "comercial"];
const ESTADOS = ["activo", "finalizado"];

const CSV_COLUMNS = [
  { header: "ID", value: (a) => a.id_asignacion },
  { header: "Cliente", value: (a) => a.cliente?.razon_social || fullName(a.cliente) },
  { header: "Documento cliente", value: (a) => a.cliente?.num_doc },
  { header: "Servicio", value: (a) => a.servicio?.nombre },
  { header: "Precio base (COP)", value: (a) => a.servicio?.precio_base },
  { header: "Usuario responsable", value: (a) => fullName(a.usuario) },
  { header: "Correo responsable", value: (a) => a.usuario?.correo },
  { header: "Fecha inicio", value: (a) => a.fecha_inicio },
  { header: "Fecha fin", value: (a) => a.fecha_fin },
  { header: "Estado", value: (a) => a.estado },
  { header: "Observaciones", value: (a) => a.observaciones }
];

const EMPTY_FORM = {
  id_cliente: "",
  id_servicio: "",
  id_usuario: "",
  fecha_inicio: "",
  fecha_fin: "",
  estado: "activo",
  observaciones: ""
};

function resolveApiMessage(result, fallback) {
  if (result.networkError && !result.payload) {
    return "No fue posible conectar con el servidor. Verifique que el backend de Secure Net esté en ejecución.";
  }

  if (result.payload?.message) {
    return result.payload.message;
  }

  return fallback;
}

function readList(result, fallback) {
  if (!result.ok || !result.payload?.success || !Array.isArray(result.payload.data)) {
    return { items: [], error: resolveApiMessage(result, fallback) };
  }

  return { items: result.payload.data, error: "" };
}

function isActivo(item) {
  return item?.activo === true;
}

function persona(item) {
  return [item?.nombres, item?.apellidos].filter(Boolean).join(" ").trim();
}

function labelCliente(cliente) {
  if (!cliente) {
    return "Cliente";
  }

  const nombre = persona(cliente);
  const documento = cliente.num_doc ? String(cliente.num_doc) : "";

  if (cliente.razon_social) {
    const extra = [nombre, documento].filter(Boolean).join(" · ");
    return extra ? `${cliente.razon_social} (${extra})` : cliente.razon_social;
  }

  return [nombre, documento].filter(Boolean).join(" · ") || "Cliente";
}

function labelServicio(servicio) {
  if (!servicio?.nombre) {
    return "Servicio";
  }

  return servicio.categoria?.nombre
    ? `${servicio.nombre} · ${servicio.categoria.nombre}`
    : servicio.nombre;
}

function labelUsuario(usuario) {
  const nombre = persona(usuario);
  if (nombre && usuario?.correo) {
    return `${nombre} · ${usuario.correo}`;
  }

  return nombre || usuario?.correo || "Usuario";
}

function formatFecha(value) {
  if (!value) {
    return "—";
  }

  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return String(value);
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function estadoLabel(estado) {
  if (estado === "activo") {
    return "Activo";
  }

  if (estado === "finalizado") {
    return "Finalizado";
  }

  return estado || "—";
}

function toForm(asignacion) {
  const estado = ESTADOS.includes(asignacion.estado) ? asignacion.estado : "activo";

  return {
    id_cliente: asignacion.cliente?.id_cliente ? String(asignacion.cliente.id_cliente) : "",
    id_servicio: asignacion.servicio?.id_servicio ? String(asignacion.servicio.id_servicio) : "",
    id_usuario: asignacion.usuario?.id_usuario ? String(asignacion.usuario.id_usuario) : "",
    fecha_inicio: asignacion.fecha_inicio ? String(asignacion.fecha_inicio).slice(0, 10) : "",
    fecha_fin: asignacion.fecha_fin ? String(asignacion.fecha_fin).slice(0, 10) : "",
    estado,
    observaciones: asignacion.observaciones || ""
  };
}

function validateForm(form) {
  const errors = {};

  if (!form.id_cliente) {
    errors.id_cliente = "El cliente es obligatorio.";
  }

  if (!form.id_servicio) {
    errors.id_servicio = "El servicio es obligatorio.";
  }

  if (!form.id_usuario) {
    errors.id_usuario = "El usuario responsable es obligatorio.";
  }

  if (!form.fecha_inicio) {
    errors.fecha_inicio = "La fecha de inicio es obligatoria.";
  }

  if (form.fecha_fin && form.fecha_inicio && form.fecha_fin < form.fecha_inicio) {
    errors.fecha_fin = "La fecha de fin no puede ser anterior a la fecha de inicio.";
  }

  if (!ESTADOS.includes(form.estado)) {
    errors.estado = "El estado solo puede ser activo o finalizado.";
  }

  return errors;
}

function buildPayload(form) {
  return {
    id_cliente: Number(form.id_cliente),
    id_servicio: Number(form.id_servicio),
    id_usuario: Number(form.id_usuario),
    fecha_inicio: form.fecha_inicio,
    fecha_fin: form.fecha_fin || null,
    estado: form.estado,
    observaciones: form.observaciones.trim() || null
  };
}

function includeCurrent(options, current, idKey) {
  const currentId = Number(current?.[idKey]);
  if (!Number.isInteger(currentId) || currentId <= 0) {
    return options;
  }

  if (options.some((item) => Number(item[idKey]) === currentId)) {
    return options;
  }

  return [current, ...options];
}

export function AsignacionesPage() {
  const { rol } = useAuth();
  const canWrite = WRITE_ROLES.includes(String(rol?.nombre_rol || "").toLowerCase());

  const [asignaciones, setAsignaciones] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [notice, setNotice] = useState(null);
  const [statusId, setStatusId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogos, setCatalogos] = useState({ clientes: [], servicios: [], usuarios: [] });
  const [catalogoError, setCatalogoError] = useState("");
  const [relacionActual, setRelacionActual] = useState(null);

  const clientes = useMemo(
    () => includeCurrent(catalogos.clientes.filter(isActivo), relacionActual?.cliente, "id_cliente"),
    [catalogos.clientes, relacionActual]
  );
  const servicios = useMemo(
    () => includeCurrent(catalogos.servicios.filter(isActivo), relacionActual?.servicio, "id_servicio"),
    [catalogos.servicios, relacionActual]
  );
  const usuarios = useMemo(
    () => includeCurrent(catalogos.usuarios.filter(isActivo), relacionActual?.usuario, "id_usuario"),
    [catalogos.usuarios, relacionActual]
  );

  async function loadAsignaciones({ silent = false } = {}) {
    if (!silent) {
      setListLoading(true);
    }
    setListError("");

    const result = await listarAsignaciones();
    if (!result.ok || !result.payload?.success || !Array.isArray(result.payload.data)) {
      setListError(resolveApiMessage(result, "No fue posible obtener las asignaciones."));
      if (!silent) {
        setAsignaciones([]);
      }
      setListLoading(false);
      return false;
    }

    setAsignaciones(result.payload.data);
    setListLoading(false);
    return true;
  }

  async function loadCatalogos() {
    const [clientesResult, serviciosResult, usuariosResult] = await Promise.all([
      listClientes(),
      listServicios(),
      listarUsuarios()
    ]);

    const clientesData = readList(clientesResult, "No fue posible obtener los clientes.");
    const serviciosData = readList(serviciosResult, "No fue posible obtener los servicios.");
    const usuariosData = readList(usuariosResult, "No fue posible obtener los usuarios.");

    setCatalogos({
      clientes: clientesData.items,
      servicios: serviciosData.items,
      usuarios: usuariosData.items
    });

    const messages = [clientesData.error, serviciosData.error, usuariosData.error].filter(Boolean);
    setCatalogoError(messages.join(" "));
    return messages.length === 0;
  }

  useEffect(() => {
    loadAsignaciones();
  }, []);

  useEffect(() => {
    if (!modalOpen) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === "Escape" && !saving && !formLoading) {
        setModalOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, saving, formLoading]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setRelacionActual(null);
    setFieldErrors({});
    setFormError("");
    setCatalogoError("");
    setNotice(null);
    setModalOpen(true);
    setFormLoading(true);
    await loadCatalogos();
    setFormLoading(false);
  }

  async function openEdit(asignacion) {
    setFormMode("edit");
    setEditingId(asignacion.id_asignacion);
    setForm(toForm(asignacion));
    setRelacionActual({
      cliente: asignacion.cliente,
      servicio: asignacion.servicio,
      usuario: asignacion.usuario
    });
    setFieldErrors({});
    setFormError("");
    setCatalogoError("");
    setNotice(null);
    setModalOpen(true);
    setFormLoading(true);

    const [result] = await Promise.all([obtenerAsignacion(asignacion.id_asignacion), loadCatalogos()]);
    setFormLoading(false);

    if (!result.ok || !result.payload?.success || !result.payload.data) {
      setFormError(resolveApiMessage(result, "No fue posible cargar la asignación."));
      return;
    }

    const loaded = result.payload.data;
    setForm(toForm(loaded));
    setRelacionActual({
      cliente: loaded.cliente,
      servicio: loaded.servicio,
      usuario: loaded.usuario
    });
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
    const payload = buildPayload(form);
    const result =
      formMode === "edit"
        ? await actualizarAsignacion(editingId, payload)
        : await crearAsignacion(payload);
    setSaving(false);

    if (!result.ok || !result.payload?.success) {
      setFormError(resolveApiMessage(result, "No fue posible guardar la asignación."));
      return;
    }

    setModalOpen(false);
    setForm(EMPTY_FORM);
    setNotice({
      type: "success",
      text: result.payload.message || "Asignación guardada correctamente."
    });
    await loadAsignaciones({ silent: true });
  }

  async function handleToggleEstado(asignacion) {
    const siguiente = asignacion.estado === "activo" ? "finalizado" : "activo";
    setNotice(null);
    setStatusId(asignacion.id_asignacion);

    const result = await cambiarEstadoAsignacion(asignacion.id_asignacion, siguiente);
    setStatusId(null);

    if (!result.ok || !result.payload?.success) {
      setNotice({
        type: "error",
        text: resolveApiMessage(result, "No fue posible cambiar el estado de la asignación.")
      });
      return;
    }

    setNotice({
      type: "success",
      text: result.payload.message || "Estado actualizado correctamente."
    });
    await loadAsignaciones({ silent: true });
  }

  const busy = saving || statusId !== null;
  const catalogosIncompletos = clientes.length === 0 || servicios.length === 0 || usuarios.length === 0;

  return (
    <section className="sn-module">
      <div className="sn-page-head">
        <div>
          <h1>Asignaciones</h1>
          <p className="sn-muted">
            {canWrite
              ? "Relaciona un cliente, un servicio y el usuario responsable."
              : "Consulta de asignaciones. Tu rol no puede crear ni modificar registros."}
          </p>
        </div>
        <div className="sn-actions">
          <button
            type="button"
            className="sn-btn sn-btn-ghost"
            onClick={() => exportToCsv("asignaciones", CSV_COLUMNS, asignaciones)}
            disabled={listLoading || asignaciones.length === 0}
          >
            Exportar CSV
          </button>
          {canWrite ? (
            <button type="button" className="sn-btn" onClick={openCreate} disabled={busy}>
              Nueva asignación
            </button>
          ) : null}
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

      {listLoading || asignaciones.length > 0 || !listError ? (
        <div className="sn-card sn-table-card">
          {listLoading ? (
            <p className="sn-loading">
              <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
              Cargando asignaciones...
            </p>
          ) : null}

          {!listLoading && !listError && asignaciones.length === 0 ? (
            <div className="sn-empty">
              <strong>No hay asignaciones registradas.</strong>
              <p className="sn-muted">Cuando existan asignaciones, aparecerán en este listado.</p>
            </div>
          ) : null}

          {!listLoading && asignaciones.length > 0 ? (
            <div className="sn-table-wrap">
              <table className="sn-table sn-table-wide">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Usuario responsable</th>
                    <th>Fecha inicio</th>
                    <th>Fecha fin</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.map((asignacion) => {
                    const changing = statusId === asignacion.id_asignacion;
                    const clienteNombre = asignacion.cliente?.razon_social || persona(asignacion.cliente);
                    const clienteDetalle = asignacion.cliente?.razon_social
                      ? persona(asignacion.cliente)
                      : asignacion.cliente?.num_doc;

                    return (
                      <tr key={asignacion.id_asignacion}>
                        <td>
                          <strong>{clienteNombre || "—"}</strong>
                          {clienteDetalle ? <div className="sn-cell-sub">{clienteDetalle}</div> : null}
                        </td>
                        <td>{asignacion.servicio?.nombre || "—"}</td>
                        <td>
                          <strong>{persona(asignacion.usuario) || "—"}</strong>
                          {asignacion.usuario?.correo ? (
                            <div className="sn-cell-sub">{asignacion.usuario.correo}</div>
                          ) : null}
                        </td>
                        <td>{formatFecha(asignacion.fecha_inicio)}</td>
                        <td>{formatFecha(asignacion.fecha_fin)}</td>
                        <td>
                          <span
                            className={`sn-badge${
                              asignacion.estado === "activo"
                                ? " sn-badge-active"
                                : asignacion.estado === "finalizado"
                                  ? " sn-badge-finalizado"
                                  : " sn-badge-inactive"
                            }`}
                          >
                            {estadoLabel(asignacion.estado)}
                          </span>
                        </td>
                        <td className="sn-cell-text">{asignacion.observaciones || "—"}</td>
                        <td>
                          {canWrite ? (
                            <div className="sn-actions">
                              <button
                                type="button"
                                className="sn-btn sn-btn-ghost sn-btn-sm"
                                onClick={() => openEdit(asignacion)}
                                disabled={busy}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="sn-btn sn-btn-ghost sn-btn-sm"
                                onClick={() => handleToggleEstado(asignacion)}
                                disabled={busy || !ESTADOS.includes(asignacion.estado)}
                              >
                                {changing
                                  ? "Guardando..."
                                  : asignacion.estado === "activo"
                                    ? "Finalizar"
                                    : "Activar"}
                              </button>
                            </div>
                          ) : (
                            <span className="sn-cell-sub">Solo consulta</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="sn-modal-backdrop"
          onClick={() => !saving && !formLoading && setModalOpen(false)}
        >
          <div
            className="sn-card sn-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="asignacion-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="asignacion-form-title">
              {formMode === "edit" ? "Editar asignación" : "Nueva asignación"}
            </h2>
            <p className="sn-muted">
              Cliente, servicio, usuario responsable y fecha de inicio son obligatorios. La fecha de
              fin y las observaciones son opcionales.
            </p>

            {formError ? (
              <div className="sn-alert" role="alert">
                {formError}
              </div>
            ) : null}

            {catalogoError ? (
              <div className="sn-alert" role="alert">
                {catalogoError}
              </div>
            ) : null}

            {formLoading ? (
              <p className="sn-loading">
                <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
                Cargando datos de la asignación...
              </p>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="sn-field">
                  <label htmlFor="id_cliente">Cliente</label>
                  <span className={`sn-input-shell${fieldErrors.id_cliente ? " is-invalid" : ""}`}>
                    <select
                      id="id_cliente"
                      className="sn-input-plain"
                      value={form.id_cliente}
                      onChange={(event) => updateField("id_cliente", event.target.value)}
                      disabled={saving || clientes.length === 0}
                    >
                      <option value="">Seleccione un cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id_cliente} value={cliente.id_cliente}>
                          {labelCliente(cliente)}
                        </option>
                      ))}
                    </select>
                  </span>
                  {fieldErrors.id_cliente ? (
                    <span className="sn-field-error">{fieldErrors.id_cliente}</span>
                  ) : null}
                  {clientes.length === 0 ? (
                    <span className="sn-field-error">No hay clientes activos para asignar.</span>
                  ) : null}
                </div>

                <div className="sn-form-grid">
                  <div className="sn-field">
                    <label htmlFor="id_servicio">Servicio</label>
                    <span className={`sn-input-shell${fieldErrors.id_servicio ? " is-invalid" : ""}`}>
                      <select
                        id="id_servicio"
                        className="sn-input-plain"
                        value={form.id_servicio}
                        onChange={(event) => updateField("id_servicio", event.target.value)}
                        disabled={saving || servicios.length === 0}
                      >
                        <option value="">Seleccione un servicio</option>
                        {servicios.map((servicio) => (
                          <option key={servicio.id_servicio} value={servicio.id_servicio}>
                            {labelServicio(servicio)}
                          </option>
                        ))}
                      </select>
                    </span>
                    {fieldErrors.id_servicio ? (
                      <span className="sn-field-error">{fieldErrors.id_servicio}</span>
                    ) : null}
                    {servicios.length === 0 ? (
                      <span className="sn-field-error">No hay servicios activos para asignar.</span>
                    ) : null}
                  </div>

                  <div className="sn-field">
                    <label htmlFor="id_usuario">Usuario responsable</label>
                    <span className={`sn-input-shell${fieldErrors.id_usuario ? " is-invalid" : ""}`}>
                      <select
                        id="id_usuario"
                        className="sn-input-plain"
                        value={form.id_usuario}
                        onChange={(event) => updateField("id_usuario", event.target.value)}
                        disabled={saving || usuarios.length === 0}
                      >
                        <option value="">Seleccione un usuario</option>
                        {usuarios.map((usuario) => (
                          <option key={usuario.id_usuario} value={usuario.id_usuario}>
                            {labelUsuario(usuario)}
                          </option>
                        ))}
                      </select>
                    </span>
                    {fieldErrors.id_usuario ? (
                      <span className="sn-field-error">{fieldErrors.id_usuario}</span>
                    ) : null}
                    {usuarios.length === 0 ? (
                      <span className="sn-field-error">No hay usuarios activos para asignar.</span>
                    ) : null}
                  </div>
                </div>

                <div className="sn-form-grid">
                  <div className="sn-field">
                    <label htmlFor="fecha_inicio">Fecha de inicio</label>
                    <span className={`sn-input-shell${fieldErrors.fecha_inicio ? " is-invalid" : ""}`}>
                      <input
                        id="fecha_inicio"
                        type="date"
                        className="sn-input-plain"
                        value={form.fecha_inicio}
                        onChange={(event) => updateField("fecha_inicio", event.target.value)}
                        disabled={saving}
                      />
                    </span>
                    {fieldErrors.fecha_inicio ? (
                      <span className="sn-field-error">{fieldErrors.fecha_inicio}</span>
                    ) : null}
                  </div>

                  <div className="sn-field">
                    <label htmlFor="fecha_fin">Fecha de fin</label>
                    <span className={`sn-input-shell${fieldErrors.fecha_fin ? " is-invalid" : ""}`}>
                      <input
                        id="fecha_fin"
                        type="date"
                        className="sn-input-plain"
                        value={form.fecha_fin}
                        onChange={(event) => updateField("fecha_fin", event.target.value)}
                        disabled={saving}
                      />
                    </span>
                    {fieldErrors.fecha_fin ? (
                      <span className="sn-field-error">{fieldErrors.fecha_fin}</span>
                    ) : null}
                  </div>
                </div>

                <div className="sn-field">
                  <label htmlFor="estado">Estado</label>
                  <span className={`sn-input-shell${fieldErrors.estado ? " is-invalid" : ""}`}>
                    <select
                      id="estado"
                      className="sn-input-plain"
                      value={form.estado}
                      onChange={(event) => updateField("estado", event.target.value)}
                      disabled={saving}
                    >
                      <option value="activo">Activo</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  </span>
                  {fieldErrors.estado ? <span className="sn-field-error">{fieldErrors.estado}</span> : null}
                </div>

                <div className="sn-field">
                  <label htmlFor="observaciones">Observaciones</label>
                  <span className={`sn-input-shell${fieldErrors.observaciones ? " is-invalid" : ""}`}>
                    <textarea
                      id="observaciones"
                      className="sn-input-plain"
                      value={form.observaciones}
                      onChange={(event) => updateField("observaciones", event.target.value)}
                      disabled={saving}
                    />
                  </span>
                </div>

                <div className="sn-modal-actions">
                  <button
                    type="button"
                    className="sn-btn sn-btn-ghost"
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button className="sn-btn" type="submit" disabled={saving || catalogosIncompletos}>
                    {saving ? (
                      <span className="sn-btn-loading">
                        <span className="sn-spinner" aria-hidden="true" />
                        Guardando...
                      </span>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}