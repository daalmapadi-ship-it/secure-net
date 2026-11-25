import { apiRequest } from "./api";

export function listCategorias() {
  return apiRequest("/api/categorias");
}

export function getCategoria(id) {
  return apiRequest(`/api/categorias/${id}`);
}

export function createCategoria(payload) {
  return apiRequest("/api/categorias", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateCategoria(id, payload) {
  return apiRequest(`/api/categorias/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteCategoria(id) {
  return apiRequest(`/api/categorias/${id}`, {
    method: "DELETE"
  });
}
