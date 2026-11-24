import type {
  AmbitoFestivo,
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

// Colores para el gráfico de prioridades en Analíticas (reutilizan los mismos tokens que PrioridadChip).
export const PRIORIDAD_CHART_COLOR: Record<Prioridad, string> = {
  Baja: "var(--success)",
  Media: "var(--warning)",
  Alta: "var(--danger-soft-foreground)",
  Critica: "var(--danger)",
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
  Otro: "Otro",
};

export const TIPO_EVENTO_COLOR: Record<TipoEvento, ChipColor> = {
  Reunion: "accent",
  Entrega: "warning",
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

export const AMBITO_FESTIVO_LABEL: Record<AmbitoFestivo, string> = {
  Nacional: "Nacional",
  Autonomico: "Autonómico / regional",
  Local: "Local",
  Otro: "Otro",
};

// Paleta propia del Gantt de tareas. Las barras llevan el texto en blanco, así que se usan tonos
// fijos de luminosidad media (equivalentes a Tailwind 500-700) con contraste ≥ 4.5:1 frente al
// blanco y visibles tanto sobre la superficie clara como sobre la oscura. Los tokens semánticos de
// HeroUI (ESTADO_TAREA_COLOR) no sirven aquí: tres estados caen en el mismo gris, que además pasa a
// ser casi blanco en modo oscuro, y success / warning son demasiado claros para texto blanco.
export const ESTADO_TAREA_GANTT_COLOR: Record<EstadoTarea, string> = {
  Backlog: "#64748b", // slate-500: pendiente de priorizar, neutro azulado
  Planificada: "#0f766e", // teal-700: comprometida pero sin empezar
  EnCurso: "#2563eb", // blue-600: mismo tono que el acento (y que "En curso" en el Gantt de proyectos)
  EnRevision: "#7c3aed", // violet-600: revisión / QA, claramente distinta de curso y de bloqueo
  Bloqueada: "#dc2626", // red-600: requiere atención
  Hecha: "#15803d", // green-700: terminada
  Cancelada: "#71717a", // zinc-500: descartada (además se atenúa y se tacha)
};

// Marca de prioridad del Gantt de tareas: escala de intensidad creciente que no coincide con
// ningún color de estado, para que la franja izquierda se distinga sobre cualquier barra.
export const PRIORIDAD_GANTT_COLOR: Record<Prioridad, string> = {
  Baja: "#cbd5e1", // slate-300
  Media: "#fbbf24", // amber-400
  Alta: "#f97316", // orange-500
  Critica: "#7f1d1d", // red-900
};

// Equipos y proyectos que ya no están en marcha: se muestran atenuados en los listados.
export const esEquipoInactivo = (estado: EstadoEquipo) => estado === "Inactivo";
export const esProyectoInactivo = (estado: EstadoProyecto) => estado === "Cerrado" || estado === "Cancelado";
export const TARJETA_INACTIVA_CLASS = "border-dashed bg-surface-secondary opacity-70 hover:opacity-100 transition-opacity";
