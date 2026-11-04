import { Button, useTheme } from "@heroui/react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  IconCalendar,
  IconChartBar,
  IconDashboard,
  IconFolder,
  IconGraph,
  IconKanban,
  IconListTasks,
  IconLogout,
  IconMoon,
  IconPerson,
  IconSettings,
  IconSun,
  IconTeam,
  IconUmbrella,
  IconUsers,
  IconWarning,
} from "../Icons";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: IconDashboard, end: true },
  { to: "/personas", label: "Personas", icon: IconUsers },
  { to: "/equipos", label: "Equipos", icon: IconTeam },
  { to: "/proyectos", label: "Proyectos", icon: IconFolder },
  { to: "/tareas", label: "Tareas", icon: IconListTasks },
  { to: "/tareas/mapa", label: "Mapa de tareas", icon: IconGraph },
  { to: "/tablero", label: "Tablero por equipo", icon: IconKanban },
  { to: "/tablero-usuarios", label: "Tablero por usuario", icon: IconPerson },
  { to: "/tablero-proyecto", label: "Tablero por proyecto", icon: IconFolder },
  { to: "/calendario", label: "Calendario", icon: IconCalendar },
  { to: "/vacaciones", label: "Vacaciones", icon: IconUmbrella },
  { to: "/analiticas", label: "Analíticas", icon: IconChartBar },
  { to: "/riesgos", label: "Riesgos y bloqueos", icon: IconWarning },
  { to: "/configuracion", label: "Configuración", icon: IconSettings },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme("system");

  return (
    <div className="flex h-full min-h-screen w-full bg-background text-foreground">
      <aside className="flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4">
        <div className="mb-4 px-2">
          <p className="text-lg font-semibold">DHub</p>
          <p className="text-xs text-muted">Coordinación técnica</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent-soft text-accent-soft-foreground"
                    : "text-muted hover:bg-surface-secondary hover:text-foreground"
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-sm font-medium">{user?.nombre}</p>
              <p className="text-xs text-muted">@{user?.usuario}</p>
            </div>
            <Button
              isIconOnly
              aria-label="Cambiar tema"
              size="sm"
              variant="ghost"
              onPress={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? <IconSun /> : <IconMoon />}
            </Button>
          </div>
          <Button size="sm" variant="ghost" onPress={logout}>
            <IconLogout />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
