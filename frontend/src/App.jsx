import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./context/AuthContext";
import { AsignacionesPage } from "./pages/AsignacionesPage";
import { ClientesPage } from "./pages/ClientesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ReportesPage } from "./pages/ReportesPage";
import { ServiciosPage } from "./pages/ServiciosPage";
import { UsuariosPage } from "./pages/UsuariosPage";
import { ProtectedRoute, PublicOnlyRoute } from "./routes/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/servicios" element={<ServiciosPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/asignaciones" element={<AsignacionesPage />} />
              <Route path="/reportes" element={<ReportesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
