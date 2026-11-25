import { apiRequest } from "./api";

export function listClientes() {
  return apiRequest("/api/clientes");
}

export function getCliente(id) {
  return apiRequest(`/api/clientes/${id}`);
}

export function createCliente(payload) {
  return apiRequest("/api/clientes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateCliente(id, payload) {
  return apiRequest(`/api/clientes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function setClienteEstado(id, activo) {
  return apiRequest(`/api/clientes/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ activo })
  });
}
