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
export type TipoEvento = "Reunion" | "Entrega" | "Otro";

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
  creadoEn: string;
  actualizadoEn: string;
  // Dependencias fin → inicio: tareas que deben terminar antes que esta, y las que esperan a esta.
  bloqueadaPor: TareaDependencia[];
  bloquea: TareaDependencia[];
}

export interface TareaDependencia {
  id: string;
  titulo: string;
  proyectoCodigo: string;
  estado: EstadoTarea;
  fechaInicio: string | null;
  fechaObjetivo: string | null;
}

export interface TareaCambio {
  id: string;
  fecha: string;
  usuario: string;
  // Propiedad cambiada ("Estado", "ResponsableId"…), "Creada" o "HistorialIniciado".
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
}

export interface CapacidadTarea {
  tareaId: string;
  titulo: string;
  proyectoCodigo: string;
  horas: number;
  vencida: boolean;
}

export interface CapacidadSemana {
  lunes: string;
  capacidadHoras: number;
  cargaHoras: number;
  diasAusencia: number;
  ausencias: string[];
  tareas: CapacidadTarea[];
}

export interface CapacidadPersona {
  personaId: string;
  nombre: string;
  equipos: EquipoResumen[];
  disponibilidadSemanalHoras: number;
  // Estimación de tareas que no se pueden situar en la matriz: sin fechas, o ya vencidas sin cerrar.
  horasSinPlanificar: number;
  horasAtrasadas: number;
  tareasSinPlanificar: CapacidadTarea[];
  tareasAtrasadas: CapacidadTarea[];
  semanas: CapacidadSemana[];
}

export interface Capacidad {
  desde: string;
  semanas: number;
  personas: CapacidadPersona[];
}

export interface Ausencia {
  tipo: "Vacaciones" | "Festivo";
  detalle: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface TiempoEstado {
  estado: EstadoTarea;
  diasTotales: number;
  tareas: number;
  mediaDias: number;
}

export interface TiemposEstado {
  estados: TiempoEstado[];
  episodiosBloqueo: number;
  bloqueosAbiertos: number;
  mediaDiasBloqueo: number | null;
  historialDesde: string | null;
}

export interface Hito {
  id: string;
  proyectoId: string;
  nombre: string;
  fecha: string;
  estado: EstadoHito;
  descripcion: string | null;
  creadoEn?: string;
  actualizadoEn?: string;
}

// Hito con los datos de su proyecto (listado global de hitos).
export interface HitoListado extends Hito {
  proyectoCodigo: string;
  proyectoNombre: string;
  proyectoEstado: EstadoProyecto;
  equipoId: string | null;
  equipoNombre: string | null;
  responsableId: string | null;
  responsableNombre: string | null;
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
  creadoEn: string;
  actualizadoEn: string;
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

export interface JiraEspacio {
  id: string;
  nombre: string;
  clave: string;
}

export interface JiraConfiguracion {
  configurado: boolean;
  baseUrl: string | null;
  email: string | null;
  tokenEnmascarado: string | null;
  fechaActualizacion: string | null;
}

export interface JiraTicketInfo {
  clave: string;
  resumen: string;
  estado: string;
  asignadoNombre: string | null;
  actualizado: string | null;
  url: string;
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

export type AmbitoFestivo = "Nacional" | "Autonomico" | "Local" | "Otro";

export interface Festivo {
  id: string;
  nombre: string;
  ambito: AmbitoFestivo;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  comentario: string | null;
  personaIds: string[];
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
  proyectosEnRiesgoIds: string[];
  tareasHoyList: Tarea[];
  ausenciasHoy: AusenciaHoy[];
}

export interface AusenciaHoy {
  personaId: string;
  personaNombre: string;
  tipo: "Vacaciones" | "Festivo";
  detalle: string | null;
  fechaFin: string;
}
