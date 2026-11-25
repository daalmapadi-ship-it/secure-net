import { useEffect, useState } from "react";
import { listarAsignaciones } from "../services/asignacion.service";
import { listClientes } from "../services/cliente.service";
import { listarReportes } from "../services/reporte.service";
import { listServicios } from "../services/servicio.service";
import { listarUsuarios } from "../services/usuario.service";

const ACTIVITY_LIMIT = 5;

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
    return {
      ok: false,
      items: [],
      error: resolveApiMessage(result, fallback)
    };
  }

  return { ok: true, items: result.payload.data, error: "" };
}

function persona(item) {
  return [item?.nombres, item?.apellidos].filter(Boolean).join(" ").trim();
}

function nombreCliente(cliente) {
  return cliente?.razon_social || persona(cliente) || "Cliente";
}

function nombreUsuario(usuario) {
  return persona(usuario) || usuario?.correo || "Usuario";
}

function formatFecha(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const hasTime = String(value).includes("T") || String(value).includes(":");
  return date.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {})
  });
}

function recentByDate(items, getDate) {
  return items
    .filter((item) => {
      const value = getDate(item);
      return value && !Number.isNaN(new Date(value).getTime());
    })
    .sort((left, right) => new Date(getDate(right)).getTime() - new Date(getDate(left)).getTime())
    .slice(0, ACTIVITY_LIMIT);
}

function countActivos(items) {
  return items.filter((item) => item.activo === true).length;
}

function MetricCard({ label, source, value }) {
  return (
    <article className="sn-card sn-stat-card">
      <p className="sn-stat-label">{label}</p>
      {source?.ok ? (
        <p className="sn-stat-value">{value}</p>
      ) : (
        <>
          <p className="sn-stat-value">—</p>
          <p className="sn-stat-note">No fue posible cargar este dato.</p>
        </>
      )}
    </article>
  );
}

function SummaryItem({ label, source }) {
  return (
    <article className="sn-card sn-summary-item">
      <p className="sn-stat-label">{label}</p>
      <strong>{source?.ok ? source.items.length : "—"}</strong>
    </article>
  );
}

function ActivityCard({ title, source, emptyText, items }) {
  return (
    <article className="sn-card">
      <h2>{title}</h2>
      {source?.ok ? null : <p className="sn-stat-note">No fue posible cargar este dato.</p>}
      {source?.ok && items.length === 0 ? <p className="sn-muted">{emptyText}</p> : null}
      {source?.ok && items.length > 0 ? (
        <div className="sn-activity-list">
          {items.map((item) => (
            <div className="sn-activity-item" key={item.key}>
              <strong>{item.title}</strong>
              {item.detail ? <p className="sn-cell-sub">{item.detail}</p> : null}
              <p className="sn-cell-sub">{item.when}</p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function DashboardPage() {
  const [sources, setSources] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);

    const [clientesResult, serviciosResult, usuariosResult, asignacionesResult, reportesResult] =
      await Promise.all([
        listClientes(),
        listServicios(),
        listarUsuarios(),
        listarAsignaciones(),
        listarReportes()
      ]);

    setSources({
      clientes: readList(clientesResult, "No fue posible obtener los clientes."),
      servicios: readList(serviciosResult, "No fue posible obtener los servicios."),
      usuarios: readList(usuariosResult, "No fue posible obtener los usuarios."),
      asignaciones: readList(asignacionesResult, "No fue posible obtener las asignaciones."),
      reportes: readList(reportesResult, "No fue posible obtener los reportes.")
    });
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const errores = sources
    ? Object.values(sources)
        .map((source) => source.error)
        .filter(Boolean)
    : [];

  const reportesRecientes = sources?.reportes.ok
    ? recentByDate(sources.reportes.items, (reporte) => reporte.generado_en).map((reporte) => ({
        key: `reporte-${reporte.id_reporte}`,
        title: reporte.titulo || "Reporte",
        detail: [reporte.tipo, nombreUsuario(reporte.usuario)].filter(Boolean).join(" · "),
        when: formatFecha(reporte.generado_en)
      }))
    : [];

  const asignacionesRecientes = sources?.asignaciones.ok
    ? recentByDate(sources.asignaciones.items, (asignacion) => asignacion.creado_en).map(
        (asignacion) => ({
          key: `asignacion-${asignacion.id_asignacion}`,
          title: asignacion.servicio?.nombre || "Asignación",
          detail: [
            nombreCliente(asignacion.cliente),
            asignacion.estado === "activo"
              ? "Activo"
              : asignacion.estado === "finalizado"
                ? "Finalizado"
                : asignacion.estado
          ]
            .filter(Boolean)
            .join(" · "),
          when: formatFecha(asignacion.creado_en)
        })
      )
    : [];

  const clientesRecientes = sources?.clientes.ok
    ? recentByDate(sources.clientes.items, (cliente) => cliente.creado_en).map((cliente) => ({
        key: `cliente-${cliente.id_cliente}`,
        title: nombreCliente(cliente),
        detail: persona(cliente) && cliente.razon_social ? persona(cliente) : cliente.num_doc || "",
        when: formatFecha(cliente.creado_en)
      }))
    : [];

  return (
    <section className="sn-module">
      <div className="sn-page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="sn-muted">Resumen real de clientes, servicios, usuarios, asignaciones y reportes.</p>
        </div>
        <button type="button" className="sn-btn" onClick={loadDashboard} disabled={loading}>
          {loading ? (
            <span className="sn-btn-loading">
              <span className="sn-spinner" aria-hidden="true" />
              Actualizando...
            </span>
          ) : (
            "Actualizar"
          )}
        </button>
      </div>

      {loading && !sources ? (
        <div className="sn-card">
          <p className="sn-loading">
            <span className="sn-spinner sn-spinner-ink" aria-hidden="true" />
            Cargando el panel...
          </p>
        </div>
      ) : null}

      {errores.length > 0 ? (
        <div className="sn-alert" role="alert">
          No fue posible cargar todos los datos. {errores.join(" ")}
        </div>
      ) : null}

      {sources ? (
        <>
          <div className="sn-stat-grid">
            <MetricCard
              label="Clientes activos"
              source={sources.clientes}
              value={countActivos(sources.clientes.items)}
            />
            <MetricCard
              label="Servicios activos"
              source={sources.servicios}
              value={countActivos(sources.servicios.items)}
            />
            <MetricCard
              label="Usuarios activos"
              source={sources.usuarios}
              value={countActivos(sources.usuarios.items)}
            />
            <MetricCard
              label="Asignaciones activas"
              source={sources.asignaciones}
              value={sources.asignaciones.items.filter((item) => item.estado === "activo").length}
            />
            <MetricCard
              label="Reportes generados"
              source={sources.reportes}
              value={sources.reportes.items.length}
            />
          </div>

          <div className="sn-summary-grid">
            <SummaryItem label="Total de clientes" source={sources.clientes} />
            <SummaryItem label="Total de servicios" source={sources.servicios} />
            <SummaryItem label="Total de usuarios" source={sources.usuarios} />
            <SummaryItem label="Total de asignaciones" source={sources.asignaciones} />
            <SummaryItem label="Total de reportes" source={sources.reportes} />
          </div>

          <div className="sn-activity-grid">
            <ActivityCard
              title="Últimos reportes"
              source={sources.reportes}
              emptyText="No hay reportes generados."
              items={reportesRecientes}
            />
            <ActivityCard
              title="Últimas asignaciones"
              source={sources.asignaciones}
              emptyText="No hay asignaciones registradas."
              items={asignacionesRecientes}
            />
            <ActivityCard
              title="Clientes recientes"
              source={sources.clientes}
              emptyText="No hay clientes registrados."
              items={clientesRecientes}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
