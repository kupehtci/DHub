import { Button, useTheme } from "@heroui/react";
import { useState, type ComponentType, type SVGProps } from "react";
import { NavLink, Outlet, matchPath, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  IconCalendar,
  IconChartBar,
  IconChevronRight,
  IconDashboard,
  IconFolder,
  IconGantt,
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

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface NavLinkItem {
  to: string;
  label: string;
  icon: IconType;
  end?: boolean;
}

interface NavGroupItem {
  group: string;
  label: string;
  icon: IconType;
  children: NavLinkItem[];
}

type NavEntry = NavLinkItem | NavGroupItem;

const NAV_ITEMS: NavEntry[] = [
  { to: "/", label: "Dashboard", icon: IconDashboard, end: true },
  { to: "/personas", label: "Personas", icon: IconUsers },
  { to: "/equipos", label: "Equipos", icon: IconTeam },
  { to: "/proyectos", label: "Proyectos", icon: IconFolder },
  {
    group: "tareas",
    label: "Tareas",
    icon: IconListTasks,
    children: [
      { to: "/tareas", label: "Lista de tareas", icon: IconListTasks, end: true },
      { to: "/tareas/gantt", label: "Gantt de tareas", icon: IconGantt, end: true },
    ],
  },
  {
    group: "tableros",
    label: "Tableros Kanban",
    icon: IconKanban,
    children: [
      { to: "/tablero", label: "Por equipo", icon: IconTeam, end: true },
      { to: "/tablero-usuarios", label: "Por usuario", icon: IconPerson, end: true },
      { to: "/tablero-proyecto", label: "Por proyecto", icon: IconFolder, end: true },
    ],
  },
  { to: "/calendario", label: "Calendario", icon: IconCalendar },
  { to: "/vacaciones", label: "Vacaciones", icon: IconUmbrella },
  { to: "/analiticas", label: "Analíticas", icon: IconChartBar },
  { to: "/riesgos", label: "Riesgos y bloqueos", icon: IconWarning },
  { to: "/configuracion", label: "Configuración", icon: IconSettings },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-accent-soft text-accent-soft-foreground"
      : "text-muted hover:bg-surface-secondary hover:text-foreground"
  }`;

function SidebarLink({ to, label, icon: Icon, end }: NavLinkItem) {
  return (
    <NavLink to={to} end={end} className={linkClass}>
      <Icon />
      {label}
    </NavLink>
  );
}

function SidebarGroup({ group, label, icon: Icon, children }: NavGroupItem) {
  const { pathname } = useLocation();
  const childActive = children.some((c) => matchPath({ path: c.to, end: c.end ?? false }, pathname));
  // Ruta en la que el usuario plegó el grupo (null = desplegado). Si después
  // navega a una vista del grupo, se vuelve a desplegar automáticamente.
  const [collapsedAt, setCollapsedAt] = useState<string | null>(null);
  const open = collapsedAt === null || (childActive && collapsedAt !== pathname);

  const panelId = `nav-group-${group}`;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setCollapsedAt(open ? pathname : null)}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-secondary hover:text-foreground ${
          childActive && !open ? "bg-accent-soft text-accent-soft-foreground" : childActive ? "text-foreground" : "text-muted"
        }`}
      >
        <Icon />
        <span className="flex-1 text-left">{label}</span>
        <IconChevronRight
          width={14}
          height={14}
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div id={panelId} className="ml-4 flex flex-col gap-1 border-l border-border pl-2">
          {children.map((c) => (
            <SidebarLink key={c.to} {...c} />
          ))}
        </div>
      )}
    </div>
  );
}

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
          {NAV_ITEMS.map((item) =>
            "group" in item ? (
              <SidebarGroup key={item.group} {...item} />
            ) : (
              <SidebarLink key={item.to} {...item} />
            ),
          )}
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
