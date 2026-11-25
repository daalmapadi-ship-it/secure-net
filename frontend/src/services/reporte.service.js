import { apiRequest } from "./api";

export function listarReportes(params = {}) {
  const search = new URLSearchParams();

  if (params.id_usuario) {
    search.set("id_usuario", String(params.id_usuario));
  }

  if (params.tipo) {
    search.set("tipo", String(params.tipo).trim());
  }

  const query = search.toString();
  return apiRequest(`/api/reportes${query ? `?${query}` : ""}`);
}

export function obtenerReporte(id) {
  return apiRequest(`/api/reportes/${id}`);
}

export function crearReporte(data) {
  return apiRequest("/api/reportes", {
    method: "POST",
    body: JSON.stringify(data)
  });
}
