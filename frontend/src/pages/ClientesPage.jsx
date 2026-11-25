import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createCliente,
  getCliente,
  listClientes,
  setClienteEstado,
  updateCliente
} from "../services/cliente.service";

const WRITE_ROLES = ["administrador", "supervisor", "comercial"];
const TIPO_DOC_OPTIONS = ["CC", "CE", "NIT", "TI", "PA", "PEP", "PPT", "RC"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  tipo_doc: "CC",
  num_doc: "",
  nombres: "",
  apellidos: "",
  razon_social: "",
  correo: "",
  telefono: "",
  direccion: "",
  ciudad: ""
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

function toForm(cliente) {
  return {
    tipo_doc: cliente.tipo_doc || "CC",
    num_doc: cliente.num_doc || "",
    nombres: cliente.nombres || "",
    apellidos: cliente.apellidos || "",
    razon_social: cliente.razon_social || "",
    correo: cliente.correo || "",
    telefono: cliente.telefono || "",
    direccion: cliente.direccion || "",
    ciudad: cliente.ciudad || ""
  };
}

function buildPayload(form) {
  return {
    tipo_doc: form.tipo_doc.trim().toUpperCase(),
    num_doc: form.num_doc.trim(),
    nombres: form.nombres.trim(),
    apellidos: form.apellidos.trim(),
    razon_social: form.razon_social.trim() || null,
    correo: form.correo.trim() || null,
    telefono: form.telefono.trim() || null,
    direccion: form.direccion.trim() || null,
    ciudad: form.ciudad.trim() || null
  };
}

function validateForm(form) {
  const errors = {};
  const tipoDoc = form.tipo_doc.trim();
  const numDoc = form.num_doc.trim();
  const nombres = form.nombres.trim();
  const apellidos = form.apellidos.trim();
  const correo = form.correo.trim();

  if (!tipoDoc) {
    errors.tipo_doc = "El tipo de documento es obligatorio.";
  } else if (tipoDoc.length > 5) {
    errors.tipo_doc = "El tipo de documento no puede superar 5 caracteres.";
  }

  if (!numDoc) {
    errors.num_doc = "El número de documento es obligatorio.";
  } else if (numDoc.length > 20) {
    errors.num_doc = "El número de documento no puede superar 20 caracteres.";
  }

  if (!nombres) {
    errors.nombres = "Los nombres son obligatorios.";
  } else if (nombres.length > 80) {
    errors.nombres = "Los nombres no pueden superar 80 caracteres.";
  }

  if (!apellidos) {
    errors.apellidos = "Los apellidos son obligatorios.";
  } else if (apellidos.length > 80) {
    errors.apellidos = "Los apellidos no pueden superar 80 caracteres.";
  }

  if (form.razon_social.trim().length > 150) {
    errors.razon_social = "La razón social no puede superar 150 caracteres.";
  }

  if (correo && (!EMAIL_PATTERN.test(correo) || correo.length > 120)) {
    errors.correo = "El correo no tiene un formato válido.";
  }

  if (form.telefono.trim().length > 20) {
    errors.telefono = "El teléfono no puede superar 20 caracteres.";
  }

  if (form.direccion.trim().length > 200) {
    errors.direccion = "La dirección no puede superar 200 caracteres.";
  }

  if (form.ciudad.trim().length > 60) {
    errors.ciudad = "La ciudad no puede superar 60 caracteres.";
  }

  return errors;
}

function displayValue(value) {
  const text = String(value || "").trim();
  return text || "—";
}

export function ClientesPage() {
  const { rol } = useAuth();
  const canWrite = WRITE_ROLES.includes(String(rol?.nombre_rol || "").toLowerCase());

  const [clientes, setClientes] = useState([]);
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

  const tipoDocOptions = useMemo(() => {
    if (form.tipo_doc && !TIPO_DOC_OPTIONS.includes(form.tipo_doc)) {
      return [form.tipo_doc, ...TIPO_DOC_OPTIONS];
    }
    return TIPO_DOC_OPTIONS;
  }, [form.tipo_doc]);

  async function loadClientes({ silent = false } = {}) {
    if (!silent) {
      setListLoading(true);
    }
    setListError("");

    const result = await listClientes();

    if (!result.ok || !result.payload?.success || !Array.isArray(result.payload.data)) {
      const message = resolveApiMessage(result, "No fue posible obtener los clientes.");
      setListError(message);
      if (!silent) {
        setClientes([]);
      }
      setListLoading(false);
      return false;
    }

    setClientes(result.payload.data);
    setListLoading(false);
    return true;
  }

  useEffect(() => {
    loadClientes();
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
    setFieldErrors({});
    setFormError("");
    setFormLoading(false);
    setNotice(null);
    setModalOpen(true);
  }

  async function openEdit(cliente) {
    setFormMode("edit");
    setEditingId(cliente.id_cliente);
    setForm(toForm(cliente));
    setFieldErrors({});
    setFormError("");
    setNotice(null);
    setModalOpen(true);
    setFormLoading(true);

    const result = await getCliente(cliente.id_cliente);
    setFormLoading(false);

    if (!result.ok || !result.payload?.success || !result.payload.data) {
      setFormError(resolveApiMessage(result, "No fue posible cargar el cliente."));
      return;
    }

    setForm(toForm(result.payload.data));
  }

  function closeModal() {
    if (saving || formLoading) {
      return;
    }
    setModalOpen(false);
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
        ? await updateCliente(editingId, payload)
        : await createCliente(payload);
    setSaving(false);

    if (!result.ok || !result.payload?.success) {
      setFormError(resolveApiMessage(result, "No fue posible guardar el cliente."));
      return;
    }

    setModalOpen(false);
    setNotice({
      type: "success",
      text: result.payload.message || "Cliente guardado correctamente."
    });
    await loadClientes({ silent: true });
  }

  async function handleToggleEstado(cliente) {
    setNotice(null);
    setStatusId(cliente.id_cliente);

    const result = await setClienteEstado(cliente.id_cliente, !cliente.activo);
    setStatusId(null);

    if (!result.ok || !result.payload?.success) {
      setNotice({
        type: "error",
        text: resolveApiMessage(result, "No fue posible cambiar el estado del cliente.")
      });
      return;
    }

    setNotice({
      type: "success",
      text: result.payload.message || "Estado actualizado correctamente."
    });
    await loadClientes({ silent: true });
  }

  return (
    <section className="sn-module">
      <div className="sn-page-head">
        <div>
          <h1>Clientes</h1>
          <p className="sn-muted">
            {canWrite
              ? "Consulta, registra y actualiza los clientes de Secure Net."
              : "Consulta de clientes. Tu rol no puede crear ni modificar registros."}
          </p>
        </div>
        {canWrite ? (
          <button type="button" className="sn-btn" onClick={openCreate}>
            Nuevo cliente
          </button>
        ) : null}
      </div>

      {notice ? (
        <div
          className={`sn-alert${notice.type === "success" ? " sn-alert-success" : ""}`}
          role="status"
        >
          {notice.text}
        </div>
      ) : null}

      {listError ? (
        <div className="sn-alert" role="alert">
          {listError}
        </div>
      ) : null}

      {listLoading || clientes.length > 0 || !listError ? (
      <div className="sn-card sn-table-card">
        {listLoading ? (
          <p className="sn-loading">
            <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
            Cargando clientes...
          </p>
        ) : null}

        {!listLoading && !listError && clientes.length === 0 ? (
          <div className="sn-empty">
            <strong>No hay clientes registrados.</strong>
            <p className="sn-muted">
              {canWrite
                ? "Usa Nuevo cliente para crear el primer registro."
                : "Cuando existan clientes, aparecerán en este listado."}
            </p>
          </div>
        ) : null}

        {!listLoading && clientes.length > 0 ? (
          <div className="sn-table-wrap">
            <table className="sn-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Nombre / Razón social</th>
                  <th>Correo</th>
                  <th>Teléfono</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => {
                  const persona = [cliente.nombres, cliente.apellidos].filter(Boolean).join(" ");
                  const changing = statusId === cliente.id_cliente;

                  return (
                    <tr key={cliente.id_cliente}>
                      <td>
                        <span className="sn-doc-type">{cliente.tipo_doc}</span> {cliente.num_doc}
                      </td>
                      <td>
                        {cliente.razon_social ? (
                          <>
                            <strong>{cliente.razon_social}</strong>
                            <div className="sn-cell-sub">{persona || "—"}</div>
                          </>
                        ) : (
                          persona || "—"
                        )}
                      </td>
                      <td>{displayValue(cliente.correo)}</td>
                      <td>{displayValue(cliente.telefono)}</td>
                      <td>{displayValue(cliente.ciudad)}</td>
                      <td>
                        <span className={`sn-badge${cliente.activo ? " sn-badge-active" : " sn-badge-inactive"}`}>
                          {cliente.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        {canWrite ? (
                          <div className="sn-actions">
                            <button
                              type="button"
                              className="sn-btn sn-btn-ghost sn-btn-sm"
                              onClick={() => openEdit(cliente)}
                              disabled={changing || saving}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="sn-btn sn-btn-ghost sn-btn-sm"
                              onClick={() => handleToggleEstado(cliente)}
                              disabled={changing || saving || statusId !== null}
                            >
                              {changing ? "Guardando..." : cliente.activo ? "Desactivar" : "Activar"}
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
        <div className="sn-modal-backdrop" onClick={closeModal}>
          <div
            className="sn-card sn-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cliente-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="cliente-form-title">{formMode === "edit" ? "Editar cliente" : "Nuevo cliente"}</h2>
            <p className="sn-muted">
              Los campos de documento, nombres y apellidos son obligatorios.
            </p>

            {formError ? (
              <div className="sn-alert" role="alert">
                {formError}
              </div>
            ) : null}

            {formLoading ? (
              <p className="sn-loading">
                <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
                Cargando datos del cliente...
              </p>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="sn-form-grid">
                  <div className="sn-field">
                    <label htmlFor="tipo_doc">Tipo de documento</label>
                    <span className={`sn-input-shell${fieldErrors.tipo_doc ? " is-invalid" : ""}`}>
                      <select
                        id="tipo_doc"
                        className="sn-input-plain"
                        value={form.tipo_doc}
                        onChange={(event) => updateField("tipo_doc", event.target.value)}
                        disabled={saving}
                      >
                        {tipoDocOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </span>
                    {fieldErrors.tipo_doc ? (
                      <span className="sn-field-error">{fieldErrors.tipo_doc}</span>
                    ) : null}
                  </div>

                  <div className="sn-field">
                    <label htmlFor="num_doc">Número de documento</label>
                    <span className={`sn-input-shell${fieldErrors.num_doc ? " is-invalid" : ""}`}>
                      <input
                        id="num_doc"
                        className="sn-input-plain"
                        value={form.num_doc}
                        onChange={(event) => updateField("num_doc", event.target.value)}
                        disabled={saving}
                        maxLength={20}
                      />
                    </span>
                    {fieldErrors.num_doc ? (
                      <span className="sn-field-error">{fieldErrors.num_doc}</span>
                    ) : null}
                  </div>

                  <div className="sn-field">
                    <label htmlFor="nombres">Nombres</label>
                    <span className={`sn-input-shell${fieldErrors.nombres ? " is-invalid" : ""}`}>
                      <input
                        id="nombres"
                        className="sn-input-plain"
                        value={form.nombres}
                        onChange={(event) => updateField("nombres", event.target.value)}
                        disabled={saving}
                        maxLength={80}
                      />
                    </span>
                    {fieldErrors.nombres ? (
                      <span className="sn-field-error">{fieldErrors.nombres}</span>
                    ) : null}
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
                        maxLength={80}
                      />
                    </span>
                    {fieldErrors.apellidos ? (
                      <span className="sn-field-error">{fieldErrors.apellidos}</span>
                    ) : null}
                  </div>

                  <div className="sn-field sn-field-span">
                    <label htmlFor="razon_social">Razón social</label>
                    <span className={`sn-input-shell${fieldErrors.razon_social ? " is-invalid" : ""}`}>
                      <input
                        id="razon_social"
                        className="sn-input-plain"
                        value={form.razon_social}
                        onChange={(event) => updateField("razon_social", event.target.value)}
                        disabled={saving}
                        maxLength={150}
                      />
                    </span>
                    {fieldErrors.razon_social ? (
                      <span className="sn-field-error">{fieldErrors.razon_social}</span>
                    ) : null}
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
                        maxLength={120}
                      />
                    </span>
                    {fieldErrors.correo ? (
                      <span className="sn-field-error">{fieldErrors.correo}</span>
                    ) : null}
                  </div>

                  <div className="sn-field">
                    <label htmlFor="telefono">Teléfono</label>
                    <span className={`sn-input-shell${fieldErrors.telefono ? " is-invalid" : ""}`}>
                      <input
                        id="telefono"
                        className="sn-input-plain"
                        value={form.telefono}
                        onChange={(event) => updateField("telefono", event.target.value)}
                        disabled={saving}
                        maxLength={20}
                      />
                    </span>
                    {fieldErrors.telefono ? (
                      <span className="sn-field-error">{fieldErrors.telefono}</span>
                    ) : null}
                  </div>

                  <div className="sn-field sn-field-span">
                    <label htmlFor="direccion">Dirección</label>
                    <span className={`sn-input-shell${fieldErrors.direccion ? " is-invalid" : ""}`}>
                      <input
                        id="direccion"
                        className="sn-input-plain"
                        value={form.direccion}
                        onChange={(event) => updateField("direccion", event.target.value)}
                        disabled={saving}
                        maxLength={200}
                      />
                    </span>
                    {fieldErrors.direccion ? (
                      <span className="sn-field-error">{fieldErrors.direccion}</span>
                    ) : null}
                  </div>

                  <div className="sn-field">
                    <label htmlFor="ciudad">Ciudad</label>
                    <span className={`sn-input-shell${fieldErrors.ciudad ? " is-invalid" : ""}`}>
                      <input
                        id="ciudad"
                        className="sn-input-plain"
                        value={form.ciudad}
                        onChange={(event) => updateField("ciudad", event.target.value)}
                        disabled={saving}
                        maxLength={60}
                      />
                    </span>
                    {fieldErrors.ciudad ? (
                      <span className="sn-field-error">{fieldErrors.ciudad}</span>
                    ) : null}
                  </div>
                </div>

                <div className="sn-modal-actions">
                  <button
                    type="button"
                    className="sn-btn sn-btn-ghost"
                    onClick={closeModal}
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
