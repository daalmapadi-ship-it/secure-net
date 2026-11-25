import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getStoredToken, setStoredToken } from "../services/api";
import { getAuthenticatedUser, login as loginRequest } from "../services/auth.service";

const USER_KEY = "sn_user";
const ROLE_KEY = "sn_rol";

const AuthContext = createContext(null);

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function resolveLoginMessage(status, payload, networkError) {
  if (networkError) {
    return "No fue posible conectar con el servidor. Verifique que el backend de Secure Net esté en ejecución.";
  }

  if (payload?.message) {
    return payload.message;
  }

  if (status === 401) {
    return "Correo o contraseña incorrectos.";
  }

  if (status === 403) {
    return "El usuario está inactivo.";
  }

  return "No fue posible iniciar sesión.";
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [usuario, setUsuario] = useState(() => readJson(USER_KEY));
  const [rol, setRol] = useState(() => readJson(ROLE_KEY));
  const [loading, setLoading] = useState(true);

  function persistSession(nextToken, nextUsuario, nextRol) {
    setStoredToken(nextToken);
    if (nextUsuario) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUsuario));
    } else {
      localStorage.removeItem(USER_KEY);
    }
    if (nextRol) {
      localStorage.setItem(ROLE_KEY, JSON.stringify(nextRol));
    } else {
      localStorage.removeItem(ROLE_KEY);
    }
    setToken(nextToken);
    setUsuario(nextUsuario);
    setRol(nextRol);
  }

  function logout() {
    persistSession(null, null, null);
  }

  async function login(correo, clave) {
    try {
      const { ok, status, payload, networkError } = await loginRequest(correo, clave);

      if (networkError || !ok || !payload?.success || !payload.data?.token) {
        return {
          ok: false,
          message: resolveLoginMessage(status, payload, networkError)
        };
      }

      persistSession(payload.data.token, payload.data.usuario, payload.data.rol);
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: resolveLoginMessage(0, null, true)
      };
    }
  }

  useEffect(() => {
    function handleUnauthorized() {
      persistSession(null, null, null);
    }

    window.addEventListener("sn:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("sn:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        setLoading(false);
        return;
      }

      const { ok, payload, networkError, status } = await getAuthenticatedUser();

      if (networkError) {
        setLoading(false);
        return;
      }

      if (ok && payload?.success) {
        persistSession(storedToken, payload.data.usuario, payload.data.rol);
      } else if (status === 401 || status === 403 || status === 404) {
        persistSession(null, null, null);
      }

      setLoading(false);
    }

    restoreSession();
  }, []);

  const value = useMemo(
    () => ({
      token,
      usuario,
      rol,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [token, usuario, rol, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }

  return context;
}
