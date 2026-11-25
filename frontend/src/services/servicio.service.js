import { apiRequest } from "./api";

export function listServicios() {
  return apiRequest("/api/servicios");
}

export function getServicio(id) {
  return apiRequest(`/api/servicios/${id}`);
}

export function createServicio(payload) {
  return apiRequest("/api/servicios", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateServicio(id, payload) {
  return apiRequest(`/api/servicios/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function setServicioEstado(id, activo) {
  return apiRequest(`/api/servicios/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ activo })
  });
}
