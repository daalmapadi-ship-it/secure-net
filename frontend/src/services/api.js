const TOKEN_KEY = "sn_token";

export function getApiBaseUrl() {
  const value = import.meta.env.VITE_API_URL;
  return typeof value === "string" ? value.replace(/\/$/, "") : "";
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers
    });
  } catch {
    return {
      ok: false,
      status: 0,
      payload: null,
      networkError: true
    };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const proxyOrServerFailure = !payload && (response.status >= 500 || response.status === 0);

  if (response.status === 401 && path !== "/api/auth/login") {
    window.dispatchEvent(new CustomEvent("sn:unauthorized"));
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
    networkError: proxyOrServerFailure
  };
}
