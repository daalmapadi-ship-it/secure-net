import { apiRequest } from "./api";

export function listarUsuarios() {
  return apiRequest("/api/usuarios");
}

export function obtenerUsuario(id) {
  return apiRequest(`/api/usuarios/${id}`);
}

export function crearUsuario(data) {
  return apiRequest("/api/usuarios", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function actualizarUsuario(id, data) {
  return apiRequest(`/api/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function cambiarEstadoUsuario(id, activo) {
  return apiRequest(`/api/usuarios/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ activo })
  });
}
