export type EstadoPersona = "Activo" | "Vacaciones" | "BajaTemporal" | "Inactivo";
export type EstadoEquipo = "Activo" | "Inactivo";
export type EstadoProyecto = "Planificado" | "EnCurso" | "EnPausa" | "Cerrado" | "Cancelado";
export type Prioridad = "Baja" | "Media" | "Alta" | "Critica";
export type TipoTarea = "HistoriaUsuario" | "Bug" | "Tarea" | "Mejora" | "Soporte";
export type EstadoTarea =
  | "Backlog"
  | "Planificada"
  | "EnCurso"
  | "EnRevision"
  | "Bloqueada"
  | "Hecha"
  | "Cancelada";
export type EstadoHito = "Pendiente" | "EnRiesgo" | "Completado" | "Retrasado";
export type ImpactoRiesgo = "Bajo" | "Medio" | "Alto" | "Critico";
export type ProbabilidadRiesgo = "Baja" | "Media" | "Alta";
export type EstadoRiesgo = "Identificado" | "EnMitigacion" | "Mitigado" | "Materializado" | "Cerrado";
export type TipoNota = "Seguimiento" | "Decision" | "Riesgo" | "Bloqueo" | "General" | "Comentario";
export type TipoEvento = "Reunion" | "Entrega" | "Hito" | "Otro";

export const ESTADOS_TAREA: EstadoTarea[] = [
  "Backlog",
  "Planificada",
  "EnCurso",
  "EnRevision",
  "Bloqueada",
  "Hecha",
  "Cancelada",
];

export interface EquipoResumen {
  id: string;
  nombre: string;
}

export interface Persona {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  equipos: EquipoResumen[];
  disponibilidadSemanalHoras: number;
  estado: EstadoPersona;
  cargaHoras: number;
  tareasActivas: number;
  tareasBloqueadas: number;
  tareasVencidas: number;
}

export interface PersonaDetalle extends Omit<Persona, "tareasActivas" | "tareasBloqueadas" | "tareasVencidas"> {
  tareasActivas: Tarea[];
  tareasPendientes: Tarea[];
  tareasBloqueadas: Tarea[];
  proximasEntregas: Tarea[];
}

export interface Equipo {
  id: string;
  nombre: string;
  liderTecnicoId: string | null;
  liderTecnicoNombre: string | null;
  descripcion: string | null;
  estado: EstadoEquipo;
  numeroMiembros: number;
  proyectosActivos: number;
}

export interface EquipoDetalle {
  id: string;
  nombre: string;
  liderTecnicoId: string | null;
  liderTecnicoNombre: string | null;
  descripcion: string | null;
  estado: EstadoEquipo;
  miembros: Persona[];
  proyectos: Proyecto[];
}

export interface Proyecto {
  id: string;
  nombre: string;
  codigo: string;
  sistemaInformacion: string;
  clienteArea: string;
  responsableId: string | null;
  responsableNombre: string | null;
  equipoId: string | null;
  equipoNombre: string | null;
  estado: EstadoProyecto;
  fechaInicio: string;
  fechaFin: string | null;
  prioridad: Prioridad;
  jiraClaveProyecto: string | null;
  jiraProyectoUrl: string | null;
  tareasTotal: number;
  tareasVencidas: number;
  tareasBloqueadas: number;
  riesgosAltos: number;
}

export interface ProyectoDetalle extends Omit<Proyecto, "tareasTotal" | "tareasVencidas" | "tareasBloqueadas" | "riesgosAltos"> {
  hitos: Hito[];
  tareas: Tarea[];
  riesgos: Riesgo[];
  notas: Nota[];
}

export interface TareaRelacionada {
  id: string;
  titulo: string;
  proyectoCodigo: string;
  estado: EstadoTarea;
  prioridad: Prioridad;
}

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoTarea;
  estado: EstadoTarea;
  prioridad: Prioridad;
  proyectoId: string;
  proyectoNombre: string;
  proyectoCodigo: string;
  equipoId: string | null;
  equipoNombre: string | null;
  responsableId: string | null;
  responsableNombre: string | null;
  estimacionHoras: number;
  fechaInicio: string | null;
  fechaObjetivo: string | null;
  fechaCierre: string | null;
  estaVencida: boolean;
  motivoBloqueo: string | null;
  responsableBloqueoId: string | null;
  responsableBloqueoNombre: string | null;
  fechaRevisionBloqueo: string | null;
  jiraTicketUrl: string | null;
  jiraTicketClave: string | null;
  relacionadas: TareaRelacionada[];
}

export interface Hito {
  id: string;
  proyectoId: string;
  nombre: string;
  fecha: string;
  estado: EstadoHito;
  descripcion: string | null;
}

export interface Riesgo {
  id: string;
  proyectoId: string | null;
  proyectoNombre: string | null;
  tareaId: string | null;
  tareaTitulo: string | null;
  titulo: string;
  descripcion: string | null;
  impacto: ImpactoRiesgo;
  probabilidad: ProbabilidadRiesgo;
  responsableId: string | null;
  responsableNombre: string | null;
  estado: EstadoRiesgo;
  fechaDeteccion: string;
  fechaRevision: string | null;
}

export interface Nota {
  id: string;
  fecha: string;
  autorId: string;
  autorNombre: string;
  tipo: TipoNota;
  texto: string;
  proyectoId: string | null;
  proyectoNombre: string | null;
  tareaId: string | null;
  tareaTitulo: string | null;
  personaId: string | null;
  personaNombre: string | null;
}

export interface TableroPorPersona {
  personaId: string | null;
  personaNombre: string;
  cargaHoras: number;
  tareas: Tarea[];
}

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  fechaInicio: string;
  fechaFin: string | null;
  proyectoId: string | null;
  proyectoNombre: string | null;
  equipoId: string | null;
  equipoNombre: string | null;
  personaId: string | null;
  personaNombre: string | null;
}

export interface Vacacion {
  id: string;
  personaId: string;
  personaNombre: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  comentario: string | null;
}

export interface Dashboard {
  proyectosActivos: number;
  proyectosEnRiesgo: number;
  tareasVencidas: number;
  tareasBloqueadas: number;
  tareasSinResponsable: number;
  riesgosAltos: number;
  proyectos: Proyecto[];
  tareasVencidasList: Tarea[];
  tareasBloqueadasList: Tarea[];
  tareasSinResponsableList: Tarea[];
  riesgosAltosList: Riesgo[];
  proximosHitos: Hito[];
}
