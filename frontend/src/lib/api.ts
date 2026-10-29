import axios from "axios";
import type {
  Dashboard,
  Equipo,
  EquipoDetalle,
  EstadoPersona,
  Evento,
  Hito,
  Nota,
  Persona,
  PersonaDetalle,
  Proyecto,
  ProyectoDetalle,
  Riesgo,
  TableroPorPersona,
  Tarea,
} from "../types";

// En desarrollo apunta directamente a la API en localhost; en producción (Docker)
// usa rutas relativas para que Nginx haga de proxy hacia el backend.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:5280" : ""),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dhub_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function qs(params: object) {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, string | number | boolean | undefined | null>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const str = search.toString();
  return str ? `?${str}` : "";
}

export interface Cuenta {
  id: string;
  nombreUsuario: string;
  nombreCompleto: string;
  email: string | null;
  fechaCreacion: string;
  fechaActualizacion: string | null;
}

export const authApi = {
  login: (usuario: string, password: string) =>
    api.post<{ token: string; nombre: string; usuario: string }>("/api/auth/login", { usuario, password }),
  me: () => api.get<Cuenta>("/api/auth/me"),
  actualizarPerfil: (data: { nombreUsuario: string; nombreCompleto: string; email: string | null }) =>
    api.put<Cuenta>("/api/auth/perfil", data),
  cambiarPassword: (data: { passwordActual: string; passwordNueva: string }) =>
    api.put("/api/auth/password", data),
};

export interface PersonaFiltros {
  equipoId?: string;
  estado?: string;
  q?: string;
  sinEquipo?: boolean;
}

export interface PersonaPayload {
  nombre: string;
  email: string;
  rol: string;
  equipoIds: string[];
  disponibilidadSemanalHoras: number;
  estado: EstadoPersona;
}

export const personasApi = {
  listar: (f: PersonaFiltros = {}) => api.get<Persona[]>(`/api/personas${qs(f)}`),
  obtener: (id: string) => api.get<PersonaDetalle>(`/api/personas/${id}`),
  crear: (data: PersonaPayload) => api.post<Persona>("/api/personas", data),
  actualizar: (id: string, data: PersonaPayload) => api.put(`/api/personas/${id}`, data),
  eliminar: (id: string) => api.delete(`/api/personas/${id}`),
  exportUrl: (f: PersonaFiltros = {}) => `${api.defaults.baseURL}/api/personas/export${qs(f)}`,
};

export interface EquipoFiltros {
  estado?: string;
}

export const equiposApi = {
  listar: (f: EquipoFiltros = {}) => api.get<Equipo[]>(`/api/equipos${qs(f)}`),
  obtener: (id: string) => api.get<EquipoDetalle>(`/api/equipos/${id}`),
  crear: (data: Partial<Equipo>) => api.post<Equipo>("/api/equipos", data),
  actualizar: (id: string, data: Partial<Equipo>) => api.put(`/api/equipos/${id}`, data),
  eliminar: (id: string) => api.delete(`/api/equipos/${id}`),
  agregarMiembro: (equipoId: string, personaId: string) =>
    api.post(`/api/equipos/${equipoId}/miembros/${personaId}`),
  quitarMiembro: (equipoId: string, personaId: string) =>
    api.delete(`/api/equipos/${equipoId}/miembros/${personaId}`),
  tableroPorUsuario: (equipoId: string) =>
    api.get<TableroPorPersona[]>(`/api/equipos/${equipoId}/tablero-usuarios`),
  tablero: (equipoId: string) => api.get<Tarea[]>(`/api/equipos/${equipoId}/tablero`),
};

export interface ProyectoFiltros {
  estado?: string;
  equipoId?: string;
  responsableId?: string;
  prioridad?: string;
  q?: string;
}

export const proyectosApi = {
  listar: (f: ProyectoFiltros = {}) => api.get<Proyecto[]>(`/api/proyectos${qs(f)}`),
  obtener: (id: string) => api.get<ProyectoDetalle>(`/api/proyectos/${id}`),
  crear: (data: Partial<Proyecto>) => api.post<Proyecto>("/api/proyectos", data),
  actualizar: (id: string, data: Partial<Proyecto>) => api.put(`/api/proyectos/${id}`, data),
  eliminar: (id: string) => api.delete(`/api/proyectos/${id}`),
  crearHito: (proyectoId: string, data: Partial<Hito>) =>
    api.post<Hito>(`/api/proyectos/${proyectoId}/hitos`, data),
  exportUrl: (f: ProyectoFiltros = {}) => `${api.defaults.baseURL}/api/proyectos/export${qs(f)}`,
};

export const hitosApi = {
  actualizar: (id: string, data: Partial<Hito>) => api.put(`/api/hitos/${id}`, data),
  eliminar: (id: string) => api.delete(`/api/hitos/${id}`),
};

export interface TareaFiltros {
  proyectoId?: string;
  equipoId?: string;
  responsableId?: string;
  estado?: string;
  prioridad?: string;
  bloqueada?: boolean;
  vencida?: boolean;
  sinResponsable?: boolean;
  q?: string;
}

export const tareasApi = {
  listar: (f: TareaFiltros = {}) => api.get<Tarea[]>(`/api/tareas${qs(f)}`),
  obtener: (id: string) => api.get<Tarea>(`/api/tareas/${id}`),
  crear: (data: Partial<Tarea>) => api.post<Tarea>("/api/tareas", data),
  actualizar: (id: string, data: Partial<Tarea>) => api.put(`/api/tareas/${id}`, data),
  cambiarEstado: (id: string, estado: string) => api.patch(`/api/tareas/${id}/estado`, { estado }),
  eliminar: (id: string) => api.delete(`/api/tareas/${id}`),
  exportUrl: (f: TareaFiltros = {}) => `${api.defaults.baseURL}/api/tareas/export${qs(f)}`,
};

export interface RiesgoFiltros {
  proyectoId?: string;
  tareaId?: string;
  estado?: string;
  impacto?: string;
  responsableId?: string;
}

export const riesgosApi = {
  listar: (f: RiesgoFiltros = {}) => api.get<Riesgo[]>(`/api/riesgos${qs(f)}`),
  obtener: (id: string) => api.get<Riesgo>(`/api/riesgos/${id}`),
  crear: (data: Partial<Riesgo>) => api.post<Riesgo>("/api/riesgos", data),
  actualizar: (id: string, data: Partial<Riesgo>) => api.put(`/api/riesgos/${id}`, data),
  eliminar: (id: string) => api.delete(`/api/riesgos/${id}`),
  exportUrl: () => `${api.defaults.baseURL}/api/riesgos/export`,
};

export const notasApi = {
  listar: (f: { proyectoId?: string; tareaId?: string; personaId?: string } = {}) =>
    api.get<Nota[]>(`/api/notas${qs(f)}`),
  crear: (data: Partial<Nota>) => api.post<Nota>("/api/notas", data),
  eliminar: (id: string) => api.delete(`/api/notas/${id}`),
};

export const dashboardApi = {
  obtener: (f: { equipoId?: string; proyectoId?: string } = {}) =>
    api.get<Dashboard>(`/api/dashboard${qs(f)}`),
};

export interface EventoFiltros {
  desde?: string;
  hasta?: string;
  proyectoId?: string;
  equipoId?: string;
  personaId?: string;
}

export const eventosApi = {
  listar: (f: EventoFiltros = {}) => api.get<Evento[]>(`/api/eventos${qs(f)}`),
  crear: (data: Partial<Evento>) => api.post<Evento>("/api/eventos", data),
  actualizar: (id: string, data: Partial<Evento>) => api.put(`/api/eventos/${id}`, data),
  eliminar: (id: string) => api.delete(`/api/eventos/${id}`),
};
