import { NavLink, Outlet, useNavigate } from "react-router-dom";
import logo from "../../assets/img/logo.png";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/clientes", label: "Clientes" },
  { to: "/servicios", label: "Servicios" },
  { to: "/usuarios", label: "Usuarios" },
  { to: "/asignaciones", label: "Asignaciones" },
  { to: "/reportes", label: "Reportes" }
];

export function AppLayout() {
  const { usuario, rol, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = usuario
    ? `${usuario.nombres} ${usuario.apellidos}`
    : "Sesión activa";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="sn-app-shell">
      <aside className="sn-sidebar">
        <div className="sn-brand">
          <img src={logo} alt="Logo Secure Net" />
          <strong>SECURE NET</strong>
        </div>
        <nav className="sn-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="sn-main">
        <header className="sn-header">
          <div>
            <strong>{displayName}</strong>
            <div className="sn-muted">{rol?.nombre_rol || "Rol no disponible"}</div>
          </div>
          <button type="button" className="sn-btn sn-btn-ghost" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </header>
        <main className="sn-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
