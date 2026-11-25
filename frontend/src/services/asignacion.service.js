import { apiRequest } from "./api";

export function listarAsignaciones() {
  return apiRequest("/api/asignaciones");
}

export function obtenerAsignacion(id) {
  return apiRequest(`/api/asignaciones/${id}`);
}

export function crearAsignacion(data) {
  return apiRequest("/api/asignaciones", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function actualizarAsignacion(id, data) {
  return apiRequest(`/api/asignaciones/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function cambiarEstadoAsignacion(id, estado) {
  return apiRequest(`/api/asignaciones/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado })
  });
}
