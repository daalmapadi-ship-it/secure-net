import { apiRequest } from "./api";

export function login(correo, clave) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ correo, clave })
  });
}

export function getAuthenticatedUser() {
  return apiRequest("/api/auth/me");
}
