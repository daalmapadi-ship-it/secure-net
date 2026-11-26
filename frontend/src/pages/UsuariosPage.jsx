import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  listarUsuarios,
  obtenerUsuario
} from "../services/usuario.service";
import { exportToCsv } from "../utils/exportCsv";

const WRITE_ROLE = "administrador";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CSV_COLUMNS = [
  { header: "ID", value: (u) => u.id_usuario },
  { header: "Nombres", value: (u) => u.nombres },
  { header: "Apellidos", value: (u) => u.apellidos },
  { header: "Correo", value: (u) => u.correo },
  { header: "Rol", value: (u) => u.rol?.nombre_rol },
  { header: "Estado", value: (u) => (u.activo ? "Activo" : "Inactivo") },
  { header: "Fecha de registro", value: (u) => u.creado_en }
];

const EMPTY_FORM = {
  id_rol: "",
  nombres: "",
  apellidos: "",
  correo: "",
  clave: "",
  confirmar: ""
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

function collectRoles(usuarios, extra) {
  const roles = new Map();

  usuarios.forEach((usuario) => {
    const id = Number(usuario.rol?.id_rol);
    const nombre = String(usuario.rol?.nombre_rol || "").trim();
    if (Number.isInteger(id) && id > 0 && nombre) {
      roles.set(id, { id_rol: id, nombre_rol: nombre });
    }
  });

  if (extra?.id_rol && extra?.nombre_rol && !roles.has(extra.id_rol)) {
    roles.set(extra.id_rol, extra);
  }

  return [...roles.values()].sort((left, right) =>
    left.nombre_rol.localeCompare(right.nombre_rol, "es")
  );
}

function toForm(usuario) {
  return {
    id_rol: usuario.rol?.id_rol ? String(usuario.rol.id_rol) : "",
    nombres: usuario.nombres || "",
    apellidos: usuario.apellidos || "",
    correo: usuario.correo || "",
    clave: "",
    confirmar: ""
  };
}

function validateForm(form, mode) {
  const errors = {};
  const nombres = form.nombres.trim();
  const apellidos = form.apellidos.trim();
  const correo = form.correo.trim();
  const clave = form.clave;
  const confirmar = form.confirmar;

  if (!form.id_rol) {
    errors.id_rol = "El rol es obligatorio.";
  }

  if (!nombres) {
    errors.nombres = "Los nombres son obligatorios.";
  }

  if (!apellidos) {
    errors.apellidos = "Los apellidos son obligatorios.";
  }

  if (!correo) {
    errors.correo = "El correo es obligatorio.";
  } else if (!EMAIL_PATTERN.test(correo)) {
    errors.correo = "El correo no tiene un formato válido.";
  }

  if (mode === "create") {
    if (!clave.trim()) {
      errors.clave = "La contraseña es obligatoria.";
    }
    if (!confirmar.trim()) {
      errors.confirmar = "Confirme la contraseña.";
    } else if (clave !== confirmar) {
      errors.confirmar = "Las contraseñas no coinciden.";
    }
  } else if (clave.trim() || confirmar.trim()) {
    if (!clave.trim()) {
      errors.clave = "Escriba la nueva contraseña o deje ambos campos vacíos.";
    } else if (clave !== confirmar) {
      errors.confirmar = "Las contraseñas no coinciden.";
    }
  }

  return errors;
}

function buildPayload(form, mode) {
  const payload = {
    id_rol: Number(form.id_rol),
    nombres: form.nombres.trim(),
    apellidos: form.apellidos.trim(),
    correo: form.correo.trim().toLowerCase()
  };

  if (mode === "create" || form.clave.trim()) {
    payload.clave = form.clave;
  }

  return payload;
}

export function UsuariosPage() {
  const { rol } = useAuth();
  const canWrite = String(rol?.nombre_rol || "").toLowerCase() === WRITE_ROLE;

  const [usuarios, setUsuarios] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [notice, setNotice] = useState(null);
  const [statusId, setStatusId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [knownRole, setKnownRole] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const roles = useMemo(() => collectRoles(usuarios, knownRole), [usuarios, knownRole]);

  async function loadUsuarios({ silent = false } = {}) {
    if (!silent) {
      setListLoading(true);
    }
    setListError("");

    const result = await listarUsuarios();
    if (!result.ok || !result.payload?.success || !Array.isArray(result.payload.data)) {
      setListError(resolveApiMessage(result, "No fue posible obtener los usuarios."));
      if (!silent) {
        setUsuarios([]);
      }
      setListLoading(false);
      return false;
    }

    setUsuarios(result.payload.data);
    setListLoading(false);
    return true;
  }

  useEffect(() => {
    loadUsuarios();
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

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setKnownRole(null);
    setFieldErrors({});
    setFormError("");
    setFormLoading(false);
    setNotice(null);
    setModalOpen(true);
  }

  async function openEdit(usuario) {
    setFormMode("edit");
    setEditingId(usuario.id_usuario);
    setForm(toForm(usuario));
    setKnownRole(
      usuario.rol?.id_rol
        ? { id_rol: Number(usuario.rol.id_rol), nombre_rol: usuario.rol.nombre_rol }
        : null
    );
    setFieldErrors({});
    setFormError("");
    setNotice(null);
    setModalOpen(true);
    setFormLoading(true);

    const result = await obtenerUsuario(usuario.id_usuario);
    setFormLoading(false);

    if (!result.ok || !result.payload?.success || !result.payload.data) {
      setFormError(resolveApiMessage(result, "No fue posible cargar el usuario."));
      return;
    }

    const loaded = result.payload.data;
    setForm(toForm(loaded));
    if (loaded.rol?.id_rol && loaded.rol?.nombre_rol) {
      setKnownRole({ id_rol: Number(loaded.rol.id_rol), nombre_rol: loaded.rol.nombre_rol });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const errors = validateForm(form, formMode);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSaving(true);
    const payload = buildPayload(form, formMode);
    const result =
      formMode === "edit"
        ? await actualizarUsuario(editingId, payload)
        : await crearUsuario(payload);
    setSaving(false);

    if (!result.ok || !result.payload?.success) {
      setFormError(resolveApiMessage(result, "No fue posible guardar el usuario."));
      return;
    }

    setModalOpen(false);
    setForm(EMPTY_FORM);
    setNotice({
      type: "success",
      text: result.payload.message || "Usuario guardado correctamente."
    });
    await loadUsuarios({ silent: true });
  }

  async function handleToggleEstado(usuario) {
    setNotice(null);
    setStatusId(usuario.id_usuario);

    const result = await cambiarEstadoUsuario(usuario.id_usuario, !usuario.activo);
    setStatusId(null);

    if (!result.ok || !result.payload?.success) {
      setNotice({
        type: "error",
        text: resolveApiMessage(result, "No fue posible cambiar el estado del usuario.")
      });
      return;
    }

    setNotice({
      type: "success",
      text: result.payload.message || "Estado actualizado correctamente."
    });
    await loadUsuarios({ silent: true });
  }

  const rolesMissing = !listLoading && !listError && roles.length === 0;
  const busy = saving || statusId !== null;

  return (
    <section className="sn-module">
      <div className="sn-page-head">
        <div>
          <h1>Usuarios</h1>
          <p className="sn-muted">
            {canWrite
              ? "Consulta, registra y actualiza los usuarios de Secure Net."
              : "Consulta de usuarios. Tu rol no puede crear ni modificar registros."}
          </p>
        </div>
        <div className="sn-actions">
          <button
            type="button"
            className="sn-btn sn-btn-ghost"
            onClick={() => exportToCsv("usuarios", CSV_COLUMNS, usuarios)}
            disabled={listLoading || usuarios.length === 0}
          >
            Exportar CSV
          </button>
          {canWrite ? (
            <button type="button" className="sn-btn" onClick={openCreate} disabled={busy || rolesMissing}>
              Nuevo usuario
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

      {rolesMissing ? (
        <div className="sn-alert" role="alert">
          No se pueden ofrecer roles porque el listado de usuarios no trae ninguno. No se asignaron
          identificadores inventados.
        </div>
      ) : null}

      {listLoading || usuarios.length > 0 || !listError ? (
        <div className="sn-card sn-table-card">
          {listLoading ? (
            <p className="sn-loading">
              <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
              Cargando usuarios...
            </p>
          ) : null}

          {!listLoading && !listError && usuarios.length === 0 ? (
            <div className="sn-empty">
              <strong>No hay usuarios registrados.</strong>
              <p className="sn-muted">
                Sin usuarios en el listado no es posible conocer los roles disponibles.
              </p>
            </div>
          ) : null}

          {!listLoading && usuarios.length > 0 ? (
            <div className="sn-table-wrap">
              <table className="sn-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Apellidos</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => {
                    const changing = statusId === usuario.id_usuario;
                    return (
                      <tr key={usuario.id_usuario}>
                        <td>
                          <strong>{usuario.nombres}</strong>
                        </td>
                        <td>{usuario.apellidos}</td>
                        <td>{usuario.correo}</td>
                        <td>{usuario.rol?.nombre_rol || "—"}</td>
                        <td>
                          <span className={`sn-badge${usuario.activo ? " sn-badge-active" : " sn-badge-inactive"}`}>
                            {usuario.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>
                          {canWrite ? (
                            <div className="sn-actions">
                              <button
                                type="button"
                                className="sn-btn sn-btn-ghost sn-btn-sm"
                                onClick={() => openEdit(usuario)}
                                disabled={busy}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="sn-btn sn-btn-ghost sn-btn-sm"
                                onClick={() => handleToggleEstado(usuario)}
                                disabled={busy}
                              >
                                {changing ? "Guardando..." : usuario.activo ? "Desactivar" : "Activar"}
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
        <div className="sn-modal-backdrop" onClick={() => !saving && !formLoading && setModalOpen(false)}>
          <div
            className="sn-card sn-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="usuario-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="usuario-form-title">{formMode === "edit" ? "Editar usuario" : "Nuevo usuario"}</h2>
            <p className="sn-muted">
              {formMode === "edit"
                ? "La contraseña es opcional. Si la deja vacía, se conserva la actual."
                : "El rol, los nombres, los apellidos, el correo y la contraseña son obligatorios."}
            </p>

            {formError ? (
              <div className="sn-alert" role="alert">
                {formError}
              </div>
            ) : null}

            {formLoading ? (
              <p className="sn-loading">
                <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
                Cargando datos del usuario...
              </p>
            ) : (
              <form onSubmit={handleSubmit} noValidate autoComplete="off">
                <div className="sn-field">
                  <label htmlFor="id_rol">Rol</label>
                  <span className={`sn-input-shell${fieldErrors.id_rol ? " is-invalid" : ""}`}>
                    <select
                      id="id_rol"
                      className="sn-input-plain"
                      value={form.id_rol}
                      onChange={(event) => updateField("id_rol", event.target.value)}
                      disabled={saving || roles.length === 0}
                    >
                      <option value="">Seleccione un rol</option>
                      {roles.map((item) => (
                        <option key={item.id_rol} value={item.id_rol}>
                          {item.nombre_rol}
                        </option>
                      ))}
                    </select>
                  </span>
                  {fieldErrors.id_rol ? <span className="sn-field-error">{fieldErrors.id_rol}</span> : null}
                  {roles.length === 0 ? (
                    <span className="sn-field-error">
                      No hay roles en el listado. No se usaron identificadores inventados.
                    </span>
                  ) : null}
                </div>

                <div className="sn-form-grid">
                  <div className="sn-field">
                    <label htmlFor="nombres">Nombres</label>
                    <span className={`sn-input-shell${fieldErrors.nombres ? " is-invalid" : ""}`}>
                      <input
                        id="nombres"
                        className="sn-input-plain"
                        value={form.nombres}
                        onChange={(event) => updateField("nombres", event.target.value)}
                        disabled={saving}
                        autoComplete="off"
                      />
                    </span>
                    {fieldErrors.nombres ? <span className="sn-field-error">{fieldErrors.nombres}</span> : null}
                  </div>

                  <div className="sn-field">
                    <label htmlFor="apellidos">Apellidos</label>
                    <span className={`sn-input-shell${fieldErrors.apellidos ? " is-invalid" : ""}`}>
                      <input
                        id="apellidos"
                        className="sn-input-plain"
                        value={form.apellidos}
                        onChange={(event) => updateField("apellidos", event.target.value)}
                        disabled={saving}
                        autoComplete="off"
                      />
                    </span>
                    {fieldErrors.apellidos ? <span className="sn-field-error">{fieldErrors.apellidos}</span> : null}
                  </div>
                </div>

                <div className="sn-field">
                  <label htmlFor="correo">Correo</label>
                  <span className={`sn-input-shell${fieldErrors.correo ? " is-invalid" : ""}`}>
                    <input
                      id="correo"
                      type="email"
                      className="sn-input-plain"
                      value={form.correo}
                      onChange={(event) => updateField("correo", event.target.value)}
                      disabled={saving}
                      autoComplete="off"
                    />
                  </span>
                  {fieldErrors.correo ? <span className="sn-field-error">{fieldErrors.correo}</span> : null}
                </div>

                <div className="sn-form-grid">
                  <div className="sn-field">
                    <label htmlFor="clave">{formMode === "edit" ? "Nueva contraseña" : "Contraseña"}</label>
                    <span className={`sn-input-shell${fieldErrors.clave ? " is-invalid" : ""}`}>
                      <input
                        id="clave"
                        type="password"
                        className="sn-input-plain"
                        value={form.clave}
                        onChange={(event) => updateField("clave", event.target.value)}
                        disabled={saving}
                        autoComplete="new-password"
                      />
                    </span>
                    {fieldErrors.clave ? <span className="sn-field-error">{fieldErrors.clave}</span> : null}
                  </div>

                  <div className="sn-field">
                    <label htmlFor="confirmar">Confirmar contraseña</label>
                    <span className={`sn-input-shell${fieldErrors.confirmar ? " is-invalid" : ""}`}>
                      <input
                        id="confirmar"
                        type="password"
                        className="sn-input-plain"
                        value={form.confirmar}
                        onChange={(event) => updateField("confirmar", event.target.value)}
                        disabled={saving}
                        autoComplete="new-password"
                      />
                    </span>
                    {fieldErrors.confirmar ? (
                      <span className="sn-field-error">{fieldErrors.confirmar}</span>
                    ) : null}
                  </div>
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
                  <button className="sn-btn" type="submit" disabled={saving || roles.length === 0}>
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