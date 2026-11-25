import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createCategoria,
  deleteCategoria,
  getCategoria,
  listCategorias,
  updateCategoria
} from "../services/categoria.service";
import {
  createServicio,
  getServicio,
  listServicios,
  setServicioEstado,
  updateServicio
} from "../services/servicio.service";

const WRITE_ROLES = ["administrador", "supervisor"];

const EMPTY_SERVICIO = {
  id_categoria: "",
  nombre: "",
  descripcion: "",
  precio_base: ""
};

const EMPTY_CATEGORIA = {
  nombre: "",
  descripcion: ""
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

function displayValue(value) {
  const text = String(value || "").trim();
  return text || "—";
}

function formatPrecio(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2
  });
}

function toServicioForm(servicio) {
  return {
    id_categoria: String(servicio.categoria?.id_categoria || ""),
    nombre: servicio.nombre || "",
    descripcion: servicio.descripcion || "",
    precio_base: servicio.precio_base === null || servicio.precio_base === undefined ? "" : String(servicio.precio_base)
  };
}

function toCategoriaForm(categoria) {
  return {
    nombre: categoria.nombre || "",
    descripcion: categoria.descripcion || ""
  };
}

function validateServicio(form) {
  const errors = {};
  const nombre = form.nombre.trim();
  const precioText = String(form.precio_base).trim().replace(",", ".");
  const precio = Number(precioText);

  if (!form.id_categoria) {
    errors.id_categoria = "La categoría es obligatoria.";
  }

  if (!nombre) {
    errors.nombre = "El nombre es obligatorio.";
  } else if (nombre.length > 100) {
    errors.nombre = "El nombre no puede superar 100 caracteres.";
  }

  if (precioText === "") {
    errors.precio_base = "El precio base es obligatorio.";
  } else if (!Number.isFinite(precio)) {
    errors.precio_base = "El precio base debe ser numérico.";
  } else if (precio < 0) {
    errors.precio_base = "El precio base no puede ser negativo.";
  }

  return errors;
}

function validateCategoria(form) {
  const errors = {};
  const nombre = form.nombre.trim();
  const descripcion = form.descripcion.trim();

  if (!nombre) {
    errors.nombre = "El nombre es obligatorio.";
  } else if (nombre.length > 80) {
    errors.nombre = "El nombre no puede superar 80 caracteres.";
  }

  if (descripcion.length > 200) {
    errors.descripcion = "La descripción no puede superar 200 caracteres.";
  }

  return errors;
}

function buildServicioPayload(form) {
  return {
    id_categoria: Number(form.id_categoria),
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim() || null,
    precio_base: Number(String(form.precio_base).trim().replace(",", "."))
  };
}

function buildCategoriaPayload(form) {
  return {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim() || null
  };
}

export function ServiciosPage() {
  const { rol } = useAuth();
  const canWrite = WRITE_ROLES.includes(String(rol?.nombre_rol || "").toLowerCase());

  const [servicios, setServicios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [serviciosLoading, setServiciosLoading] = useState(true);
  const [categoriasLoading, setCategoriasLoading] = useState(true);
  const [serviciosError, setServiciosError] = useState("");
  const [categoriasError, setCategoriasError] = useState("");
  const [notice, setNotice] = useState(null);
  const [statusId, setStatusId] = useState(null);

  const [servicioModal, setServicioModal] = useState(false);
  const [servicioMode, setServicioMode] = useState("create");
  const [servicioId, setServicioId] = useState(null);
  const [servicioForm, setServicioForm] = useState(EMPTY_SERVICIO);
  const [servicioErrors, setServicioErrors] = useState({});
  const [servicioFormError, setServicioFormError] = useState("");
  const [servicioFormLoading, setServicioFormLoading] = useState(false);
  const [servicioSaving, setServicioSaving] = useState(false);

  const [categoriaModal, setCategoriaModal] = useState(false);
  const [categoriaMode, setCategoriaMode] = useState("create");
  const [categoriaId, setCategoriaId] = useState(null);
  const [categoriaForm, setCategoriaForm] = useState(EMPTY_CATEGORIA);
  const [categoriaErrors, setCategoriaErrors] = useState({});
  const [categoriaFormError, setCategoriaFormError] = useState("");
  const [categoriaFormLoading, setCategoriaFormLoading] = useState(false);
  const [categoriaSaving, setCategoriaSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const categoriaOptions = useMemo(() => {
    const options = categorias.map((categoria) => ({
      id: String(categoria.id_categoria),
      nombre: categoria.nombre
    }));
    if (
      servicioForm.id_categoria &&
      !options.some((option) => option.id === servicioForm.id_categoria)
    ) {
      options.unshift({
        id: servicioForm.id_categoria,
        nombre: "Categoría actual"
      });
    }
    return options;
  }, [categorias, servicioForm.id_categoria]);

  async function loadServicios({ silent = false } = {}) {
    if (!silent) {
      setServiciosLoading(true);
    }
    setServiciosError("");

    const result = await listServicios();
    if (!result.ok || !result.payload?.success || !Array.isArray(result.payload.data)) {
      setServiciosError(resolveApiMessage(result, "No fue posible obtener los servicios."));
      if (!silent) {
        setServicios([]);
      }
      setServiciosLoading(false);
      return false;
    }

    setServicios(result.payload.data);
    setServiciosLoading(false);
    return true;
  }

  async function loadCategorias({ silent = false } = {}) {
    if (!silent) {
      setCategoriasLoading(true);
    }
    setCategoriasError("");

    const result = await listCategorias();
    if (!result.ok || !result.payload?.success || !Array.isArray(result.payload.data)) {
      setCategoriasError(resolveApiMessage(result, "No fue posible obtener las categorías."));
      if (!silent) {
        setCategorias([]);
      }
      setCategoriasLoading(false);
      return false;
    }

    setCategorias(result.payload.data);
    setCategoriasLoading(false);
    return true;
  }

  useEffect(() => {
    loadServicios();
    loadCategorias();
  }, []);

  useEffect(() => {
    const modalOpen = servicioModal || categoriaModal || pendingDelete;
    if (!modalOpen) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }
      if (pendingDelete && !deleting) {
        setPendingDelete(null);
        setDeleteError("");
        return;
      }
      if (servicioModal && !servicioSaving && !servicioFormLoading) {
        setServicioModal(false);
      }
      if (categoriaModal && !categoriaSaving && !categoriaFormLoading) {
        setCategoriaModal(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    servicioModal,
    categoriaModal,
    pendingDelete,
    servicioSaving,
    servicioFormLoading,
    categoriaSaving,
    categoriaFormLoading,
    deleting
  ]);

  function updateServicioField(name, value) {
    setServicioForm((current) => ({ ...current, [name]: value }));
    setServicioErrors((current) => ({ ...current, [name]: undefined }));
  }

  function updateCategoriaField(name, value) {
    setCategoriaForm((current) => ({ ...current, [name]: value }));
    setCategoriaErrors((current) => ({ ...current, [name]: undefined }));
  }

  function openCreateServicio() {
    setServicioMode("create");
    setServicioId(null);
    setServicioForm(EMPTY_SERVICIO);
    setServicioErrors({});
    setServicioFormError("");
    setServicioFormLoading(false);
    setNotice(null);
    setServicioModal(true);
  }

  async function openEditServicio(servicio) {
    setServicioMode("edit");
    setServicioId(servicio.id_servicio);
    setServicioForm(toServicioForm(servicio));
    setServicioErrors({});
    setServicioFormError("");
    setNotice(null);
    setServicioModal(true);
    setServicioFormLoading(true);

    const result = await getServicio(servicio.id_servicio);
    setServicioFormLoading(false);

    if (!result.ok || !result.payload?.success || !result.payload.data) {
      setServicioFormError(resolveApiMessage(result, "No fue posible cargar el servicio."));
      return;
    }

    setServicioForm(toServicioForm(result.payload.data));
  }

  function openCreateCategoria() {
    setCategoriaMode("create");
    setCategoriaId(null);
    setCategoriaForm(EMPTY_CATEGORIA);
    setCategoriaErrors({});
    setCategoriaFormError("");
    setCategoriaFormLoading(false);
    setNotice(null);
    setCategoriaModal(true);
  }

  async function openEditCategoria(categoria) {
    setCategoriaMode("edit");
    setCategoriaId(categoria.id_categoria);
    setCategoriaForm(toCategoriaForm(categoria));
    setCategoriaErrors({});
    setCategoriaFormError("");
    setNotice(null);
    setCategoriaModal(true);
    setCategoriaFormLoading(true);

    const result = await getCategoria(categoria.id_categoria);
    setCategoriaFormLoading(false);

    if (!result.ok || !result.payload?.success || !result.payload.data) {
      setCategoriaFormError(resolveApiMessage(result, "No fue posible cargar la categoría."));
      return;
    }

    setCategoriaForm(toCategoriaForm(result.payload.data));
  }

  function openDeleteCategoria(categoria) {
    setNotice(null);
    setDeleteError("");
    setPendingDelete(categoria);
  }

  async function handleServicioSubmit(event) {
    event.preventDefault();
    setServicioFormError("");

    const errors = validateServicio(servicioForm);
    setServicioErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setServicioSaving(true);
    const payload = buildServicioPayload(servicioForm);
    const result =
      servicioMode === "edit"
        ? await updateServicio(servicioId, payload)
        : await createServicio(payload);
    setServicioSaving(false);

    if (!result.ok || !result.payload?.success) {
      setServicioFormError(resolveApiMessage(result, "No fue posible guardar el servicio."));
      return;
    }

    setServicioModal(false);
    setNotice({
      type: "success",
      text: result.payload.message || "Servicio guardado correctamente."
    });
    await loadServicios({ silent: true });
  }

  async function handleCategoriaSubmit(event) {
    event.preventDefault();
    setCategoriaFormError("");

    const errors = validateCategoria(categoriaForm);
    setCategoriaErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setCategoriaSaving(true);
    const payload = buildCategoriaPayload(categoriaForm);
    const result =
      categoriaMode === "edit"
        ? await updateCategoria(categoriaId, payload)
        : await createCategoria(payload);
    setCategoriaSaving(false);

    if (!result.ok || !result.payload?.success) {
      setCategoriaFormError(resolveApiMessage(result, "No fue posible guardar la categoría."));
      return;
    }

    setCategoriaModal(false);
    setNotice({
      type: "success",
      text: result.payload.message || "Categoría guardada correctamente."
    });
    await Promise.all([loadCategorias({ silent: true }), loadServicios({ silent: true })]);
  }

  async function handleToggleEstado(servicio) {
    setNotice(null);
    setStatusId(servicio.id_servicio);

    const result = await setServicioEstado(servicio.id_servicio, !servicio.activo);
    setStatusId(null);

    if (!result.ok || !result.payload?.success) {
      setNotice({
        type: "error",
        text: resolveApiMessage(result, "No fue posible cambiar el estado del servicio.")
      });
      return;
    }

    setNotice({
      type: "success",
      text: result.payload.message || "Estado actualizado correctamente."
    });
    await loadServicios({ silent: true });
  }

  async function handleDeleteCategoria() {
    if (!pendingDelete) {
      return;
    }

    setDeleteError("");
    setDeleting(true);
    const result = await deleteCategoria(pendingDelete.id_categoria);
    setDeleting(false);

    if (!result.ok || !result.payload?.success) {
      setDeleteError(resolveApiMessage(result, "No fue posible eliminar la categoría."));
      return;
    }

    const nombre = pendingDelete.nombre;
    setPendingDelete(null);
    setNotice({
      type: "success",
      text: result.payload.message || `La categoría ${nombre} se eliminó correctamente.`
    });
    await loadCategorias({ silent: true });
  }

  const busy = servicioSaving || categoriaSaving || deleting || statusId !== null;

  return (
    <section className="sn-module">
      <div className="sn-page-head">
        <div>
          <h1>Servicios</h1>
          <p className="sn-muted">
            {canWrite
              ? "Administra el catálogo de servicios y sus categorías."
              : "Consulta de servicios y categorías. Tu rol no puede modificar el catálogo."}
          </p>
        </div>
      </div>

      {notice ? (
        <div className={`sn-alert${notice.type === "success" ? " sn-alert-success" : ""}`} role="status">
          {notice.text}
        </div>
      ) : null}

      <div className="sn-page-head">
        <div>
          <h2>Catálogo de servicios</h2>
          <p className="sn-muted">Nombre, categoría, precio y estado de cada servicio.</p>
        </div>
        {canWrite ? (
          <button type="button" className="sn-btn" onClick={openCreateServicio} disabled={busy}>
            Nuevo servicio
          </button>
        ) : null}
      </div>

      {serviciosError ? (
        <div className="sn-alert" role="alert">
          {serviciosError}
        </div>
      ) : null}

      {serviciosLoading || servicios.length > 0 || !serviciosError ? (
        <div className="sn-card sn-table-card">
          {serviciosLoading ? (
            <p className="sn-loading">
              <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
              Cargando servicios...
            </p>
          ) : null}

          {!serviciosLoading && !serviciosError && servicios.length === 0 ? (
            <div className="sn-empty">
              <strong>No hay servicios registrados.</strong>
              <p className="sn-muted">
                {canWrite
                  ? "Crea una categoría y luego usa Nuevo servicio."
                  : "Cuando existan servicios, aparecerán en este listado."}
              </p>
            </div>
          ) : null}

          {!serviciosLoading && servicios.length > 0 ? (
            <div className="sn-table-wrap">
              <table className="sn-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Precio base</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios.map((servicio) => {
                    const changing = statusId === servicio.id_servicio;
                    return (
                      <tr key={servicio.id_servicio}>
                        <td>
                          <strong>{servicio.nombre}</strong>
                        </td>
                        <td>{displayValue(servicio.categoria?.nombre)}</td>
                        <td className="sn-cell-text">{displayValue(servicio.descripcion)}</td>
                        <td>{formatPrecio(servicio.precio_base)}</td>
                        <td>
                          <span className={`sn-badge${servicio.activo ? " sn-badge-active" : " sn-badge-inactive"}`}>
                            {servicio.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>
                          {canWrite ? (
                            <div className="sn-actions">
                              <button
                                type="button"
                                className="sn-btn sn-btn-ghost sn-btn-sm"
                                onClick={() => openEditServicio(servicio)}
                                disabled={busy}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="sn-btn sn-btn-ghost sn-btn-sm"
                                onClick={() => handleToggleEstado(servicio)}
                                disabled={busy}
                              >
                                {changing ? "Guardando..." : servicio.activo ? "Desactivar" : "Activar"}
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

      <div className="sn-page-head sn-section">
        <div>
          <h2>Categorías</h2>
          <p className="sn-muted">Agrupan los servicios del catálogo.</p>
        </div>
        {canWrite ? (
          <button type="button" className="sn-btn" onClick={openCreateCategoria} disabled={busy}>
            Nueva categoría
          </button>
        ) : null}
      </div>

      {categoriasError ? (
        <div className="sn-alert" role="alert">
          {categoriasError}
        </div>
      ) : null}

      {categoriasLoading || categorias.length > 0 || !categoriasError ? (
        <div className="sn-card sn-table-card">
          {categoriasLoading ? (
            <p className="sn-loading">
              <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
              Cargando categorías...
            </p>
          ) : null}

          {!categoriasLoading && !categoriasError && categorias.length === 0 ? (
            <div className="sn-empty">
              <strong>No hay categorías registradas.</strong>
              <p className="sn-muted">
                {canWrite
                  ? "Usa Nueva categoría para crear la primera."
                  : "Cuando existan categorías, aparecerán en este listado."}
              </p>
            </div>
          ) : null}

          {!categoriasLoading && categorias.length > 0 ? (
            <div className="sn-table-wrap">
              <table className="sn-table sn-table-compact">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((categoria) => (
                    <tr key={categoria.id_categoria}>
                      <td>
                        <strong>{categoria.nombre}</strong>
                      </td>
                      <td className="sn-cell-text">{displayValue(categoria.descripcion)}</td>
                      <td>
                        {canWrite ? (
                          <div className="sn-actions">
                            <button
                              type="button"
                              className="sn-btn sn-btn-ghost sn-btn-sm"
                              onClick={() => openEditCategoria(categoria)}
                              disabled={busy}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="sn-btn sn-btn-ghost sn-btn-sm"
                              onClick={() => openDeleteCategoria(categoria)}
                              disabled={busy}
                            >
                              Eliminar
                            </button>
                          </div>
                        ) : (
                          <span className="sn-cell-sub">Solo consulta</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {servicioModal ? (
        <div className="sn-modal-backdrop" onClick={() => !servicioSaving && !servicioFormLoading && setServicioModal(false)}>
          <div
            className="sn-card sn-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="servicio-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="servicio-form-title">{servicioMode === "edit" ? "Editar servicio" : "Nuevo servicio"}</h2>
            <p className="sn-muted">La categoría, el nombre y el precio base son obligatorios.</p>

            {servicioFormError ? (
              <div className="sn-alert" role="alert">
                {servicioFormError}
              </div>
            ) : null}

            {servicioFormLoading ? (
              <p className="sn-loading">
                <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
                Cargando datos del servicio...
              </p>
            ) : (
              <form onSubmit={handleServicioSubmit} noValidate>
                <div className="sn-field">
                  <label htmlFor="id_categoria">Categoría</label>
                  <span className={`sn-input-shell${servicioErrors.id_categoria ? " is-invalid" : ""}`}>
                    <select
                      id="id_categoria"
                      className="sn-input-plain"
                      value={servicioForm.id_categoria}
                      onChange={(event) => updateServicioField("id_categoria", event.target.value)}
                      disabled={servicioSaving || categoriaOptions.length === 0}
                    >
                      <option value="">Seleccione una categoría</option>
                      {categoriaOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.nombre}
                        </option>
                      ))}
                    </select>
                  </span>
                  {servicioErrors.id_categoria ? (
                    <span className="sn-field-error">{servicioErrors.id_categoria}</span>
                  ) : null}
                  {!categoriasLoading && categorias.length === 0 ? (
                    <span className="sn-field-error">Primero debe existir una categoría.</span>
                  ) : null}
                </div>

                <div className="sn-field">
                  <label htmlFor="servicio_nombre">Nombre</label>
                  <span className={`sn-input-shell${servicioErrors.nombre ? " is-invalid" : ""}`}>
                    <input
                      id="servicio_nombre"
                      className="sn-input-plain"
                      value={servicioForm.nombre}
                      onChange={(event) => updateServicioField("nombre", event.target.value)}
                      disabled={servicioSaving}
                      maxLength={100}
                    />
                  </span>
                  {servicioErrors.nombre ? <span className="sn-field-error">{servicioErrors.nombre}</span> : null}
                </div>

                <div className="sn-field">
                  <label htmlFor="servicio_descripcion">Descripción</label>
                  <span className="sn-input-shell">
                    <textarea
                      id="servicio_descripcion"
                      className="sn-input-plain"
                      value={servicioForm.descripcion}
                      onChange={(event) => updateServicioField("descripcion", event.target.value)}
                      disabled={servicioSaving}
                    />
                  </span>
                </div>

                <div className="sn-field">
                  <label htmlFor="precio_base">Precio base</label>
                  <span className={`sn-input-shell${servicioErrors.precio_base ? " is-invalid" : ""}`}>
                    <input
                      id="precio_base"
                      className="sn-input-plain"
                      inputMode="decimal"
                      value={servicioForm.precio_base}
                      onChange={(event) => updateServicioField("precio_base", event.target.value)}
                      disabled={servicioSaving}
                      placeholder="0.00"
                    />
                  </span>
                  {servicioErrors.precio_base ? (
                    <span className="sn-field-error">{servicioErrors.precio_base}</span>
                  ) : null}
                </div>

                <div className="sn-modal-actions">
                  <button
                    type="button"
                    className="sn-btn sn-btn-ghost"
                    onClick={() => setServicioModal(false)}
                    disabled={servicioSaving}
                  >
                    Cancelar
                  </button>
                  <button className="sn-btn" type="submit" disabled={servicioSaving || categorias.length === 0}>
                    {servicioSaving ? (
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

      {categoriaModal ? (
        <div
          className="sn-modal-backdrop"
          onClick={() => !categoriaSaving && !categoriaFormLoading && setCategoriaModal(false)}
        >
          <div
            className="sn-card sn-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="categoria-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="categoria-form-title">
              {categoriaMode === "edit" ? "Editar categoría" : "Nueva categoría"}
            </h2>
            <p className="sn-muted">El nombre es obligatorio. La descripción es opcional.</p>

            {categoriaFormError ? (
              <div className="sn-alert" role="alert">
                {categoriaFormError}
              </div>
            ) : null}

            {categoriaFormLoading ? (
              <p className="sn-loading">
                <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
                Cargando datos de la categoría...
              </p>
            ) : (
              <form onSubmit={handleCategoriaSubmit} noValidate>
                <div className="sn-field">
                  <label htmlFor="categoria_nombre">Nombre</label>
                  <span className={`sn-input-shell${categoriaErrors.nombre ? " is-invalid" : ""}`}>
                    <input
                      id="categoria_nombre"
                      className="sn-input-plain"
                      value={categoriaForm.nombre}
                      onChange={(event) => updateCategoriaField("nombre", event.target.value)}
                      disabled={categoriaSaving}
                      maxLength={80}
                    />
                  </span>
                  {categoriaErrors.nombre ? <span className="sn-field-error">{categoriaErrors.nombre}</span> : null}
                </div>

                <div className="sn-field">
                  <label htmlFor="categoria_descripcion">Descripción</label>
                  <span className={`sn-input-shell${categoriaErrors.descripcion ? " is-invalid" : ""}`}>
                    <textarea
                      id="categoria_descripcion"
                      className="sn-input-plain"
                      value={categoriaForm.descripcion}
                      onChange={(event) => updateCategoriaField("descripcion", event.target.value)}
                      disabled={categoriaSaving}
                      maxLength={200}
                    />
                  </span>
                  {categoriaErrors.descripcion ? (
                    <span className="sn-field-error">{categoriaErrors.descripcion}</span>
                  ) : null}
                </div>

                <div className="sn-modal-actions">
                  <button
                    type="button"
                    className="sn-btn sn-btn-ghost"
                    onClick={() => setCategoriaModal(false)}
                    disabled={categoriaSaving}
                  >
                    Cancelar
                  </button>
                  <button className="sn-btn" type="submit" disabled={categoriaSaving}>
                    {categoriaSaving ? (
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

      {pendingDelete ? (
        <div className="sn-modal-backdrop" onClick={() => !deleting && setPendingDelete(null)}>
          <div
            className="sn-card sn-modal sn-modal-narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-categoria-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-categoria-title">Eliminar categoría</h2>
            <p className="sn-muted">
              ¿Eliminar la categoría <strong>{pendingDelete.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            {deleteError ? (
              <div className="sn-alert" role="alert">
                {deleteError}
              </div>
            ) : null}
            <div className="sn-modal-actions">
              <button
                type="button"
                className="sn-btn sn-btn-ghost"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button type="button" className="sn-btn sn-btn-danger" onClick={handleDeleteCategoria} disabled={deleting}>
                {deleting ? (
                  <span className="sn-btn-loading">
                    <span className="sn-spinner" aria-hidden="true" />
                    Eliminando...
                  </span>
                ) : (
                  "Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
