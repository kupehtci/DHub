import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { useAuth } from "./context/AuthContext";
import AnaliticasPage from "./pages/AnaliticasPage";
import CalendarioPage from "./pages/CalendarioPage";
import DashboardPage from "./pages/DashboardPage";
import EquipoDetallePage from "./pages/EquipoDetallePage";
import EquiposPage from "./pages/EquiposPage";
import LoginPage from "./pages/LoginPage";
import PersonaDetallePage from "./pages/PersonaDetallePage";
import PersonasPage from "./pages/PersonasPage";
import ProyectoDetallePage from "./pages/ProyectoDetallePage";
import ProyectosPage from "./pages/ProyectosPage";
import RiesgosPage from "./pages/RiesgosPage";
import SettingsPage from "./pages/SettingsPage";
import TableroEquipoPage from "./pages/TableroEquipoPage";
import TableroProyectoPage from "./pages/TableroProyectoPage";
import TableroUsuariosPage from "./pages/TableroUsuariosPage";
import TareasPage from "./pages/TareasPage";
import TareasMapaPage from "./pages/TareasMapaPage";
import VacacionesPage from "./pages/VacacionesPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/personas" element={<PersonasPage />} />
        <Route path="/personas/:id" element={<PersonaDetallePage />} />
        <Route path="/equipos" element={<EquiposPage />} />
        <Route path="/equipos/:id" element={<EquipoDetallePage />} />
        <Route path="/proyectos" element={<ProyectosPage />} />
        <Route path="/proyectos/:id" element={<ProyectoDetallePage />} />
        <Route path="/tareas" element={<TareasPage />} />
        <Route path="/tareas/mapa" element={<TareasMapaPage />} />
        <Route path="/tablero" element={<TableroEquipoPage />} />
        <Route path="/tablero-usuarios" element={<TableroUsuariosPage />} />
        <Route path="/tablero-proyecto" element={<TableroProyectoPage />} />
        <Route path="/riesgos" element={<RiesgosPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/vacaciones" element={<VacacionesPage />} />
        <Route path="/analiticas" element={<AnaliticasPage />} />
        <Route path="/configuracion" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
