import type {
  EstadoEquipo,
  EstadoHito,
  EstadoPersona,
  EstadoProyecto,
  EstadoRiesgo,
  EstadoTarea,
  ImpactoRiesgo,
  Prioridad,
  ProbabilidadRiesgo,
  TipoEvento,
  TipoNota,
  TipoTarea,
} from "../types";

type ChipColor = "default" | "accent" | "success" | "warning" | "danger";

// Colores semánticos de HeroUI como variables CSS, para usar directamente en los gráficos (recharts).
export const CHART_COLORS = {
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  muted: "var(--muted)",
  border: "var(--border)",
  foreground: "var(--foreground)",
} as const;

export const CHIP_COLOR_TO_CHART: Record<ChipColor, string> = {
  default: CHART_COLORS.muted,
  accent: CHART_COLORS.accent,
  success: CHART_COLORS.success,
  warning: CHART_COLORS.warning,
  danger: CHART_COLORS.danger,
};

export const ESTADO_TAREA_LABEL: Record<EstadoTarea, string> = {
  Backlog: "Backlog",
  Planificada: "Planificada",
  EnCurso: "En curso",
  EnRevision: "En revisión / QA",
  Bloqueada: "Bloqueada",
  Hecha: "Hecha",
  Cancelada: "Cancelada",
};

export const ESTADO_TAREA_COLOR: Record<EstadoTarea, ChipColor> = {
  Backlog: "default",
  Planificada: "default",
  EnCurso: "accent",
  EnRevision: "warning",
  Bloqueada: "danger",
  Hecha: "success",
  Cancelada: "default",
};

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  Baja: "Baja",
  Media: "Media",
  Alta: "Alta",
  Critica: "Crítica",
};

export const PRIORIDAD_COLOR: Record<Prioridad, ChipColor> = {
  Baja: "default",
  Media: "accent",
  Alta: "warning",
  Critica: "danger",
};

export const ESTADO_PROYECTO_LABEL: Record<EstadoProyecto, string> = {
  Planificado: "Planificado",
  EnCurso: "En curso",
  EnPausa: "En pausa",
  Cerrado: "Cerrado",
  Cancelado: "Cancelado",
};

export const ESTADO_PROYECTO_COLOR: Record<EstadoProyecto, ChipColor> = {
  Planificado: "default",
  EnCurso: "accent",
  EnPausa: "warning",
  Cerrado: "success",
  Cancelado: "default",
};

export const ESTADO_RIESGO_LABEL: Record<EstadoRiesgo, string> = {
  Identificado: "Identificado",
  EnMitigacion: "En mitigación",
  Mitigado: "Mitigado",
  Materializado: "Materializado",
  Cerrado: "Cerrado",
};

export const ESTADO_RIESGO_COLOR: Record<EstadoRiesgo, ChipColor> = {
  Identificado: "warning",
  EnMitigacion: "accent",
  Mitigado: "success",
  Materializado: "danger",
  Cerrado: "default",
};

export const IMPACTO_LABEL: Record<ImpactoRiesgo, string> = {
  Bajo: "Bajo",
  Medio: "Medio",
  Alto: "Alto",
  Critico: "Crítico",
};

export const IMPACTO_COLOR: Record<ImpactoRiesgo, ChipColor> = {
  Bajo: "default",
  Medio: "accent",
  Alto: "warning",
  Critico: "danger",
};

export const PROBABILIDAD_LABEL: Record<ProbabilidadRiesgo, string> = {
  Baja: "Baja",
  Media: "Media",
  Alta: "Alta",
};

export const ESTADO_HITO_LABEL: Record<EstadoHito, string> = {
  Pendiente: "Pendiente",
  EnRiesgo: "En riesgo",
  Completado: "Completado",
  Retrasado: "Retrasado",
};

export const ESTADO_HITO_COLOR: Record<EstadoHito, ChipColor> = {
  Pendiente: "default",
  EnRiesgo: "warning",
  Completado: "success",
  Retrasado: "danger",
};

export const ESTADO_PERSONA_LABEL: Record<EstadoPersona, string> = {
  Activo: "Activo",
  Vacaciones: "Vacaciones",
  BajaTemporal: "Baja temporal",
  Inactivo: "Inactivo",
};

export const ESTADO_PERSONA_COLOR: Record<EstadoPersona, ChipColor> = {
  Activo: "success",
  Vacaciones: "warning",
  BajaTemporal: "warning",
  Inactivo: "default",
};

export const ESTADO_EQUIPO_LABEL: Record<EstadoEquipo, string> = {
  Activo: "Activo",
  Inactivo: "Inactivo",
};

export const TIPO_TAREA_LABEL: Record<TipoTarea, string> = {
  HistoriaUsuario: "Historia de usuario",
  Bug: "Bug",
  Tarea: "Tarea",
  Mejora: "Mejora",
  Soporte: "Soporte",
};

export const TIPO_NOTA_LABEL: Record<TipoNota, string> = {
  Seguimiento: "Seguimiento",
  Decision: "Decisión",
  Riesgo: "Riesgo",
  Bloqueo: "Bloqueo",
  General: "General",
  Comentario: "Comentario",
};

export function formatFecha(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatHoras(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0h";
  return `${value % 1 === 0 ? value : value.toFixed(1)}h`;
}

export const TIPO_EVENTO_LABEL: Record<TipoEvento, string> = {
  Reunion: "Reunión",
  Entrega: "Entrega",
  Hito: "Hito",
  Otro: "Otro",
};

export const TIPO_EVENTO_COLOR: Record<TipoEvento, ChipColor> = {
  Reunion: "accent",
  Entrega: "warning",
  Hito: "success",
  Otro: "default",
};

export function formatHora(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function formatFechaHora(value: string | null | undefined): string {
  if (!value) return "—";
  return `${formatFecha(value)} ${formatHora(value)}`.trim();
}
