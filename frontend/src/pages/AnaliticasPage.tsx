import { Button, Card, Spinner } from "@heroui/react";
import { addDays, addMonths, differenceInCalendarDays, format, startOfMonth, startOfWeek, startOfYear, subMonths, subYears } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DateRangeField } from "../components/DateRangeField";
import { SearchableSelect } from "../components/SearchableSelect";
import { equiposApi, eventosApi, festivosApi, personasApi, proyectosApi, riesgosApi, tareasApi, vacacionesApi } from "../lib/api";
import { analiticasApi, type HitoAnalitica } from "../lib/analiticasApi";
import {
  CHART_COLORS,
  CHIP_COLOR_TO_CHART,
  ESTADO_PROYECTO_COLOR,
  ESTADO_PROYECTO_LABEL,
  ESTADO_TAREA_COLOR,
  ESTADO_TAREA_LABEL,
  IMPACTO_LABEL,
  PRIORIDAD_CHART_COLOR,
  PRIORIDAD_LABEL,
  PROBABILIDAD_LABEL,
  TIPO_EVENTO_COLOR,
  TIPO_EVENTO_LABEL,
  TIPO_TAREA_LABEL,
  formatFecha,
  formatHoras,
} from "../lib/format";
import {
  ESTADOS_TAREA,
  type Equipo,
  type EstadoProyecto,
  type Evento,
  type Festivo,
  type ImpactoRiesgo,
  type Persona,
  type Prioridad,
  type ProbabilidadRiesgo,
  type Proyecto,
  type Riesgo,
  type Tarea,
  type TipoEvento,
  type TipoTarea,
  type Vacacion,
} from "../types";

// ---------------------------------------------------------------------------
// Utilidades de fechas (todas las fechas de día se manejan como "YYYY-MM-DD",
// que se comparan correctamente como cadenas).
// ---------------------------------------------------------------------------

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const parse = (s: string) => new Date(`${s}T00:00:00`);
const dia = (s: string | null | undefined) => (s ? s.slice(0, 10) : null);
const HOY = iso(new Date());

function enRango(s: string | null, desde: string, hasta: string) {
  if (!s) return false;
  return (!desde || s >= desde) && (!hasta || s <= hasta);
}

// Días laborables (lunes a viernes) entre dos fechas, ambas incluidas.
function laborables(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  if (!desde || !hasta || desde > hasta) return dias;
  for (let d = parse(desde); iso(d) <= hasta; d = addDays(d, 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) dias.push(iso(d));
  }
  return dias;
}

const contarLaborables = (desde: string, hasta: string) => laborables(desde, hasta).length;

const estaAbierta = (t: Tarea) => t.estado !== "Hecha" && t.estado !== "Cancelada";
const cerradaEn = (t: Tarea, desde: string, hasta: string) => t.estado === "Hecha" && enRango(dia(t.fechaCierre), desde, hasta);
const riesgoAbierto = (r: Riesgo) => r.estado !== "Cerrado" && r.estado !== "Mitigado";

type Preset = { id: string; label: string; rango: () => [string, string] };

const PRESETS: Preset[] = [
  { id: "mes", label: "Último mes", rango: () => [iso(addDays(subMonths(new Date(), 1), 1)), HOY] },
  { id: "trimestre", label: "Último trimestre", rango: () => [iso(addDays(subMonths(new Date(), 3), 1)), HOY] },
  { id: "año", label: "Último año", rango: () => [iso(addDays(subYears(new Date(), 1), 1)), HOY] },
  { id: "ytd", label: "Año en curso", rango: () => [iso(startOfYear(new Date())), HOY] },
  { id: "proximo", label: "Próximo mes", rango: () => [HOY, iso(addMonths(new Date(), 1))] },
];

// Periodos (semanas o meses) en los que se agrupan las series temporales del rango elegido.
function buildPeriodos(desde: string, hasta: string) {
  const fin = hasta || HOY;
  const inicio = desde || iso(subMonths(parse(fin), 12));
  const semanal = differenceInCalendarDays(parse(fin), parse(inicio)) <= 120;
  const periodos: { label: string; inicio: string; fin: string }[] = [];
  let cursor = semanal ? startOfWeek(parse(inicio), { weekStartsOn: 1 }) : startOfMonth(parse(inicio));
  while (iso(cursor) <= fin) {
    const siguiente = semanal ? addDays(cursor, 7) : addMonths(cursor, 1);
    periodos.push({
      label: format(cursor, semanal ? "dd MMM" : "MMM yy", { locale: es }),
      inicio: iso(cursor) < inicio ? inicio : iso(cursor),
      fin: iso(addDays(siguiente, -1)) > fin ? fin : iso(addDays(siguiente, -1)),
    });
    cursor = siguiente;
  }
  return { periodos, semanal };
}

// ---------------------------------------------------------------------------
// Componentes de presentación
// ---------------------------------------------------------------------------

const axisTick = { fill: "var(--muted)", fontSize: 12 };
const tooltipStyle = {
  contentStyle: { backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 },
  labelStyle: { color: "var(--foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--foreground)" },
};
const cursorStyle = { fill: "var(--surface-secondary)" };
const legendStyle = { fontSize: 12, color: "var(--muted)" };

type Tone = "default" | "danger" | "warning" | "success" | "accent";
const TONE_CLASS: Record<Tone, string> = {
  default: "text-foreground",
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
  accent: "text-accent",
};

function Kpi({ label, value, hint, tone = "default" }: { label: string; value: string | number; hint?: string; tone?: Tone }) {
  return (
    <Card className="gap-1">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className={`text-3xl font-semibold ${TONE_CLASS[tone]}`}>{value}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </Card>
  );
}

function ChartCard({
  title,
  description,
  children,
  height = 288,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <Card className={`gap-3 ${className}`}>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        {description ? <Card.Description>{description}</Card.Description> : null}
      </Card.Header>
      <Card.Content>
        <div className="w-full" style={{ height }}>
          {children}
        </div>
      </Card.Content>
    </Card>
  );
}

function Vacio({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center text-center text-sm text-muted">{children}</div>;
}

function Seccion({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

const PRIORIDADES: Prioridad[] = ["Baja", "Media", "Alta", "Critica"];
const TIPOS_TAREA: TipoTarea[] = ["HistoriaUsuario", "Bug", "Tarea", "Mejora", "Soporte"];
const ESTADOS_PROYECTO: EstadoProyecto[] = ["Planificado", "EnCurso", "EnPausa", "Cerrado", "Cancelado"];
const IMPACTOS: ImpactoRiesgo[] = ["Critico", "Alto", "Medio", "Bajo"];
const PROBABILIDADES: ProbabilidadRiesgo[] = ["Baja", "Media", "Alta"];
const TIPOS_EVENTO: TipoEvento[] = ["Reunion", "Entrega", "Otro"];

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function AnaliticasPage() {
  // Datos base (se cargan una vez)
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  // Datos dependientes del periodo
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [hitos, setHitos] = useState<HitoAnalitica[]>([]);

  // Filtros
  const [equipoId, setEquipoId] = useState<string | null>(null);
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [[desde, hasta], setRango] = useState<[string, string]>(() => PRESETS[1].rango());
  const [presetId, setPresetId] = useState<string | null>("trimestre");

  useEffect(() => {
    Promise.all([tareasApi.listar(), personasApi.listar(), riesgosApi.listar(), proyectosApi.listar(), equiposApi.listar()])
      .then(([t, p, r, pr, eq]) => {
        setTareas(t.data);
        setPersonas(p.data);
        setRiesgos(r.data);
        setProyectos(pr.data);
        setEquipos(eq.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelado = false;
    const f = { desde: desde || undefined, hasta: hasta || undefined };
    Promise.all([
      eventosApi.listar({ desde: f.desde, hasta: f.hasta ? `${f.hasta}T23:59:59` : undefined }),
      vacacionesApi.listar(f),
      festivosApi.listar(f),
    ]).then(([ev, va, fe]) => {
      if (cancelado) return;
      setEventos(ev.data);
      setVacaciones(va.data);
      setFestivos(fe.data);
    });
    return () => {
      cancelado = true;
    };
  }, [desde, hasta]);

  useEffect(() => {
    let cancelado = false;
    analiticasApi
      .hitos({
        equipoId: equipoId ?? undefined,
        proyectoId: proyectoId ?? undefined,
        personaId: personaId ?? undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      })
      .then((r) => {
        if (!cancelado) setHitos(r.data);
      })
      .catch(() => {
        if (!cancelado) setHitos([]);
      });
    return () => {
      cancelado = true;
    };
  }, [equipoId, proyectoId, personaId, desde, hasta]);

  // ---- Opciones de filtros ----
  const equipoOptions = useMemo(
    () => [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((e) => ({ id: e.id, label: e.nombre })),
    [equipos],
  );
  const proyectoOptions = useMemo(
    () =>
      proyectos
        .filter((p) => !equipoId || p.equipoId === equipoId)
        .sort((a, b) => a.codigo.localeCompare(b.codigo))
        .map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` })),
    [proyectos, equipoId],
  );
  const personaOptions = useMemo(
    () =>
      personas
        .filter((p) => !equipoId || p.equipos.some((e) => e.id === equipoId))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((p) => ({ id: p.id, label: p.nombre })),
    [personas, equipoId],
  );

  const cambiarEquipo = (id: string | null) => {
    setEquipoId(id);
    if (id && proyectoId && proyectos.find((p) => p.id === proyectoId)?.equipoId !== id) setProyectoId(null);
    if (id && personaId && !personas.find((p) => p.id === personaId)?.equipos.some((e) => e.id === id)) setPersonaId(null);
  };

  const hayFiltros = Boolean(equipoId || proyectoId || personaId);

  // ---- Alcance según filtros ----
  const tareasScope = useMemo(
    () =>
      tareas.filter(
        (t) =>
          (!equipoId || t.equipoId === equipoId) &&
          (!proyectoId || t.proyectoId === proyectoId) &&
          (!personaId || t.responsableId === personaId),
      ),
    [tareas, equipoId, proyectoId, personaId],
  );

  const proyectosScope = useMemo(
    () =>
      proyectos.filter(
        (p) =>
          (!equipoId || p.equipoId === equipoId) &&
          (!proyectoId || p.id === proyectoId) &&
          (!personaId || p.responsableId === personaId || tareas.some((t) => t.proyectoId === p.id && t.responsableId === personaId)),
      ),
    [proyectos, tareas, equipoId, proyectoId, personaId],
  );
  const proyectoIdsScope = useMemo(() => new Set(proyectosScope.map((p) => p.id)), [proyectosScope]);

  const personasScope = useMemo(
    () =>
      personas.filter(
        (p) =>
          p.estado !== "Inactivo" &&
          (!personaId || p.id === personaId) &&
          (!equipoId || p.equipos.some((e) => e.id === equipoId)) &&
          (!proyectoId ||
            proyectos.find((pr) => pr.id === proyectoId)?.responsableId === p.id ||
            tareas.some((t) => t.proyectoId === proyectoId && t.responsableId === p.id)),
      ),
    [personas, proyectos, tareas, equipoId, proyectoId, personaId],
  );

  const riesgosScope = useMemo(
    () =>
      riesgos.filter((r) => {
        if (!hayFiltros) return true;
        if (personaId && r.responsableId === personaId) return true;
        return r.proyectoId !== null && proyectoIdsScope.has(r.proyectoId);
      }),
    [riesgos, hayFiltros, personaId, proyectoIdsScope],
  );

  const eventosScope = useMemo(
    () =>
      eventos.filter((e) => {
        if (!hayFiltros) return true;
        if (personaId && e.personaId === personaId) return true;
        if (!proyectoId && !personaId && equipoId && e.equipoId === equipoId) return true;
        return e.proyectoId !== null && proyectoIdsScope.has(e.proyectoId);
      }),
    [eventos, hayFiltros, equipoId, proyectoId, personaId, proyectoIdsScope],
  );

  // ---- KPIs ----
  const kpis = useMemo(() => {
    const cerradas = tareasScope.filter((t) => cerradaEn(t, desde, hasta));
    const iniciadas = tareasScope.filter((t) => t.estado !== "Cancelada" && enRango(dia(t.fechaInicio), desde, hasta)).length;

    const conInicio = cerradas.filter((t) => t.fechaInicio);
    const leadTime = conInicio.length
      ? conInicio.reduce((s, t) => s + Math.max(0, differenceInCalendarDays(parse(dia(t.fechaCierre)!), parse(dia(t.fechaInicio)!))), 0) /
        conInicio.length
      : null;

    const conObjetivo = cerradas.filter((t) => t.fechaObjetivo);
    const aTiempo = conObjetivo.filter((t) => dia(t.fechaCierre)! <= dia(t.fechaObjetivo)!).length;

    const abiertas = tareasScope.filter(estaAbierta);
    const bloqueadas = abiertas.filter((t) => t.estado === "Bloqueada");
    const revisionVencida = bloqueadas.filter((t) => t.fechaRevisionBloqueo && dia(t.fechaRevisionBloqueo)! < HOY).length;

    const hitosVencidos = hitos.filter((h) => dia(h.fecha)! <= HOY);
    const hitosCumplidos = hitosVencidos.filter((h) => h.estado === "Completado").length;

    return {
      cerradas: cerradas.length,
      iniciadas,
      leadTime,
      leadTimeN: conInicio.length,
      aTiempoPct: conObjetivo.length ? Math.round((aTiempo / conObjetivo.length) * 100) : null,
      aTiempo,
      conObjetivo: conObjetivo.length,
      vencidas: tareasScope.filter((t) => t.estaVencida).length,
      bloqueadas: bloqueadas.length,
      revisionVencida,
      horasAbiertas: abiertas.reduce((s, t) => s + (t.estimacionHoras || 0), 0),
      abiertas: abiertas.length,
      sinEstimar: abiertas.filter((t) => !t.estimacionHoras).length,
      riesgosAltos: riesgosScope.filter((r) => riesgoAbierto(r) && (r.impacto === "Alto" || r.impacto === "Critico")).length,
      hitosPct: hitosVencidos.length ? Math.round((hitosCumplidos / hitosVencidos.length) * 100) : null,
      hitosCumplidos,
      hitosVencidos: hitosVencidos.length,
    };
  }, [tareasScope, riesgosScope, hitos, desde, hasta]);

  // ---- Flujo de entrega ----
  const { periodos, semanal } = useMemo(() => buildPeriodos(desde, hasta), [desde, hasta]);

  const flujo = useMemo(
    () =>
      periodos.map((p) => {
        const cerradas = tareasScope.filter((t) => cerradaEn(t, p.inicio, p.fin));
        return {
          label: p.label,
          iniciadas: tareasScope.filter((t) => t.estado !== "Cancelada" && enRango(dia(t.fechaInicio), p.inicio, p.fin)).length,
          cerradas: cerradas.length,
          aTiempo: cerradas.filter((t) => t.fechaObjetivo && dia(t.fechaCierre)! <= dia(t.fechaObjetivo)!).length,
          tarde: cerradas.filter((t) => t.fechaObjetivo && dia(t.fechaCierre)! > dia(t.fechaObjetivo)!).length,
          sinObjetivo: cerradas.filter((t) => !t.fechaObjetivo).length,
        };
      }),
    [periodos, tareasScope],
  );

  const leadTimePorTipo = useMemo(() => {
    const cerradas = tareasScope.filter((t) => cerradaEn(t, desde, hasta) && t.fechaInicio);
    return TIPOS_TAREA.map((tipo) => {
      const delTipo = cerradas.filter((t) => t.tipo === tipo);
      const media = delTipo.length
        ? delTipo.reduce((s, t) => s + Math.max(0, differenceInCalendarDays(parse(dia(t.fechaCierre)!), parse(dia(t.fechaInicio)!))), 0) / delTipo.length
        : 0;
      return { tipo: TIPO_TAREA_LABEL[tipo], dias: Math.round(media * 10) / 10, n: delTipo.length };
    }).filter((d) => d.n > 0);
  }, [tareasScope, desde, hasta]);

  // ---- Composición del trabajo ----
  // "Tareas del periodo": las abiertas ahora más las cerradas (o canceladas) dentro del rango.
  const tareasPeriodo = useMemo(
    () => tareasScope.filter((t) => estaAbierta(t) || enRango(dia(t.fechaCierre), desde, hasta)),
    [tareasScope, desde, hasta],
  );

  const porEstado = useMemo(
    () =>
      ESTADOS_TAREA.map((e) => ({
        estado: ESTADO_TAREA_LABEL[e],
        cantidad: tareasPeriodo.filter((t) => t.estado === e).length,
        color: CHIP_COLOR_TO_CHART[ESTADO_TAREA_COLOR[e]],
      })),
    [tareasPeriodo],
  );

  const porPrioridad = useMemo(() => {
    const abiertas = tareasScope.filter(estaAbierta);
    return PRIORIDADES.map((p) => ({
      prioridad: PRIORIDAD_LABEL[p],
      cantidad: abiertas.filter((t) => t.prioridad === p).length,
      color: PRIORIDAD_CHART_COLOR[p],
    }));
  }, [tareasScope]);

  const porTipo = useMemo(
    () =>
      TIPOS_TAREA.map((tipo) => ({
        tipo: TIPO_TAREA_LABEL[tipo],
        abiertas: tareasScope.filter((t) => t.tipo === tipo && estaAbierta(t)).length,
        cerradas: tareasScope.filter((t) => t.tipo === tipo && cerradaEn(t, desde, hasta)).length,
      })),
    [tareasScope, desde, hasta],
  );

  // ---- Personas y capacidad ----
  const capacidad = useMemo(() => {
    if (!desde || !hasta) return [];
    const diasPeriodo = laborables(desde, hasta);
    const diasSet = new Set(diasPeriodo);
    const incluyeFuturo = hasta >= HOY;

    return personasScope
      .map((p) => {
        // Días de ausencia (vacaciones + festivos que le afectan) que caen en días laborables del periodo.
        const ausencias = new Set<string>();
        const marcar = (ini: string, fin: string) => {
          laborables(ini < desde ? desde : ini, fin > hasta ? hasta : fin).forEach((d) => diasSet.has(d) && ausencias.add(d));
        };
        vacaciones.filter((v) => v.personaId === p.id).forEach((v) => marcar(dia(v.fechaInicio)!, dia(v.fechaFin)!));
        festivos.filter((f) => f.personaIds.includes(p.id)).forEach((f) => marcar(dia(f.fechaInicio)!, dia(f.fechaFin)!));

        const diasDisponibles = diasPeriodo.length - ausencias.size;
        const capacidadHoras = (p.disponibilidadSemanalHoras / 5) * diasDisponibles;

        let planificada = 0;
        let sinFechas = 0;
        tareasScope
          .filter((t) => t.responsableId === p.id && t.estado !== "Cancelada" && t.estimacionHoras > 0)
          .forEach((t) => {
            const ini = dia(t.fechaInicio);
            const fin = t.estado === "Hecha" ? (dia(t.fechaCierre) ?? dia(t.fechaObjetivo)) : dia(t.fechaObjetivo);
            if (ini && fin) {
              // Se reparte la estimación proporcionalmente a los días laborables solapados con el periodo.
              const total = Math.max(1, contarLaborables(ini, fin));
              const solape = contarLaborables(ini < desde ? desde : ini, fin > hasta ? hasta : fin);
              planificada += (t.estimacionHoras * solape) / total;
            } else if (estaAbierta(t) && incluyeFuturo) {
              sinFechas += t.estimacionHoras;
            }
          });

        const carga = planificada + sinFechas;
        return {
          nombre: p.nombre,
          capacidad: Math.round(capacidadHoras),
          planificada: Math.round(planificada),
          sinFechas: Math.round(sinFechas),
          ausencias: ausencias.size,
          ocupacion: capacidadHoras > 0 ? Math.round((carga / capacidadHoras) * 100) : null,
        };
      })
      .sort((a, b) => (b.ocupacion ?? Infinity) - (a.ocupacion ?? Infinity))
      .slice(0, 12);
  }, [personasScope, tareasScope, vacaciones, festivos, desde, hasta]);

  const incidenciasPorPersona = useMemo(() => {
    const mapa = new Map<string, { nombre: string; vencidas: number; bloqueadas: number }>();
    tareasScope.filter(estaAbierta).forEach((t) => {
      if (!t.estaVencida && t.estado !== "Bloqueada") return;
      const key = t.responsableId ?? "_";
      const fila = mapa.get(key) ?? { nombre: t.responsableNombre ?? "Sin asignar", vencidas: 0, bloqueadas: 0 };
      if (t.estaVencida) fila.vencidas++;
      if (t.estado === "Bloqueada") fila.bloqueadas++;
      mapa.set(key, fila);
    });
    return [...mapa.values()].sort((a, b) => b.vencidas + b.bloqueadas - (a.vencidas + a.bloqueadas)).slice(0, 10);
  }, [tareasScope]);

  // ---- Proyectos, hitos y riesgos ----
  const proyectosPorEstado = useMemo(
    () =>
      ESTADOS_PROYECTO.map((e) => ({
        estado: ESTADO_PROYECTO_LABEL[e],
        cantidad: proyectosScope.filter((p) => p.estado === e).length,
        color: CHIP_COLOR_TO_CHART[ESTADO_PROYECTO_COLOR[e]],
      })),
    [proyectosScope],
  );

  const saludProyectos = useMemo(
    () =>
      proyectosScope
        .filter((p) => p.estado !== "Cerrado" && p.estado !== "Cancelado")
        .map((p) => {
          const delProyecto = tareasScope.filter((t) => t.proyectoId === p.id && estaAbierta(t));
          return {
            nombre: p.codigo,
            proyecto: p.nombre,
            vencidas: delProyecto.filter((t) => t.estaVencida).length,
            bloqueadas: delProyecto.filter((t) => t.estado === "Bloqueada").length,
            riesgos: riesgosScope.filter(
              (r) => r.proyectoId === p.id && riesgoAbierto(r) && (r.impacto === "Alto" || r.impacto === "Critico"),
            ).length,
          };
        })
        .filter((p) => p.vencidas + p.bloqueadas + p.riesgos > 0)
        .sort((a, b) => b.vencidas + b.bloqueadas + b.riesgos - (a.vencidas + a.bloqueadas + a.riesgos))
        .slice(0, 10),
    [proyectosScope, tareasScope, riesgosScope],
  );

  const hitosResumen = useMemo(() => {
    const retrasado = (h: HitoAnalitica) => h.estado === "Retrasado" || (h.estado !== "Completado" && dia(h.fecha)! < HOY);
    const grupos = [
      { estado: "Completados", cantidad: hitos.filter((h) => h.estado === "Completado").length, color: CHART_COLORS.success },
      { estado: "Retrasados", cantidad: hitos.filter(retrasado).length, color: CHART_COLORS.danger },
      { estado: "En riesgo", cantidad: hitos.filter((h) => !retrasado(h) && h.estado === "EnRiesgo").length, color: CHART_COLORS.warning },
      { estado: "Pendientes", cantidad: hitos.filter((h) => !retrasado(h) && h.estado === "Pendiente").length, color: CHART_COLORS.muted },
    ];
    return { grupos, retrasados: hitos.filter(retrasado).slice(0, 5) };
  }, [hitos]);

  const matrizRiesgos = useMemo(() => {
    const abiertos = riesgosScope.filter(riesgoAbierto);
    return IMPACTOS.map((impacto) => ({
      impacto,
      celdas: PROBABILIDADES.map((prob) => ({ prob, n: abiertos.filter((r) => r.impacto === impacto && r.probabilidad === prob).length })),
    }));
  }, [riesgosScope]);

  const eventosPorTipo = useMemo(
    () =>
      TIPOS_EVENTO.map((tipo) => ({
        tipo: TIPO_EVENTO_LABEL[tipo],
        cantidad: eventosScope.filter((e) => e.tipo === tipo).length,
        color: CHIP_COLOR_TO_CHART[TIPO_EVENTO_COLOR[tipo]],
      })),
    [eventosScope],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const textoPeriodo = desde && hasta ? `${formatFecha(desde)} – ${formatFecha(hasta)}` : "todo el histórico";
  const alturaFilas = (n: number) => Math.max(160, n * 34 + 60);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Analíticas</h1>
        <p className="text-sm text-muted">Flujo de entrega, carga del equipo, proyectos, hitos y riesgos · {textoPeriodo}</p>
      </div>

      {/* Filtros */}
      <Card className="gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchableSelect label="Equipo" options={equipoOptions} placeholder="Todos los equipos" value={equipoId} onChange={cambiarEquipo} />
          <SearchableSelect label="Proyecto" options={proyectoOptions} placeholder="Todos los proyectos" value={proyectoId} onChange={setProyectoId} />
          <SearchableSelect label="Persona" options={personaOptions} placeholder="Todas las personas" value={personaId} onChange={setPersonaId} />
          <DateRangeField
            end={hasta}
            label="Periodo"
            start={desde}
            onChange={(s, e) => {
              setRango([s, e]);
              setPresetId(null);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={presetId === p.id ? "primary" : "secondary"}
              onPress={() => {
                setRango(p.rango());
                setPresetId(p.id);
              }}
            >
              {p.label}
            </Button>
          ))}
          {hayFiltros ? (
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setEquipoId(null);
                setProyectoId(null);
                setPersonaId(null);
              }}
            >
              Quitar filtros
            </Button>
          ) : null}
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi hint={`${kpis.iniciadas} iniciadas en el periodo`} label="Tareas cerradas" tone="success" value={kpis.cerradas} />
        <Kpi
          hint={kpis.leadTimeN ? `Inicio → cierre · ${kpis.leadTimeN} tareas` : "Sin tareas cerradas con fecha de inicio"}
          label="Lead time medio"
          value={kpis.leadTime === null ? "—" : `${kpis.leadTime.toFixed(1)} d`}
        />
        <Kpi
          hint={kpis.conObjetivo ? `${kpis.aTiempo} de ${kpis.conObjetivo} con fecha objetivo` : "Sin cierres con fecha objetivo"}
          label="Entregadas a tiempo"
          tone={kpis.aTiempoPct === null ? "default" : kpis.aTiempoPct >= 80 ? "success" : kpis.aTiempoPct >= 60 ? "warning" : "danger"}
          value={kpis.aTiempoPct === null ? "—" : `${kpis.aTiempoPct}%`}
        />
        <Kpi
          hint={kpis.hitosVencidos ? `${kpis.hitosCumplidos} de ${kpis.hitosVencidos} hitos con fecha ya pasada` : "Sin hitos vencidos en el periodo"}
          label="Hitos cumplidos"
          tone={kpis.hitosPct === null ? "default" : kpis.hitosPct >= 80 ? "success" : "warning"}
          value={kpis.hitosPct === null ? "—" : `${kpis.hitosPct}%`}
        />
        <Kpi hint="Abiertas con fecha objetivo pasada (ahora)" label="Tareas vencidas" tone={kpis.vencidas ? "danger" : "default"} value={kpis.vencidas} />
        <Kpi
          hint={kpis.revisionVencida ? `${kpis.revisionVencida} con la revisión del bloqueo vencida` : "Ninguna con la revisión vencida"}
          label="Tareas bloqueadas"
          tone={kpis.bloqueadas ? "warning" : "default"}
          value={kpis.bloqueadas}
        />
        <Kpi
          hint={`${kpis.abiertas} tareas abiertas${kpis.sinEstimar ? ` · ${kpis.sinEstimar} sin estimar` : ""}`}
          label="Horas estimadas abiertas"
          tone="accent"
          value={formatHoras(Math.round(kpis.horasAbiertas))}
        />
        <Kpi hint="Impacto alto o crítico, no mitigados ni cerrados" label="Riesgos altos abiertos" tone={kpis.riesgosAltos ? "danger" : "default"} value={kpis.riesgosAltos} />
      </div>

      <Seccion description="Tareas iniciadas y cerradas en el periodo, y cumplimiento de la fecha objetivo." title="Flujo de entrega">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            description={`Por ${semanal ? "semana" : "mes"}: tareas con fecha de inicio frente a tareas cerradas (estado Hecha)`}
            title="Iniciadas vs. cerradas"
          >
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={flujo}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="label" tick={axisTick} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={cursorStyle} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="iniciadas" fill={CHART_COLORS.accent} name="Iniciadas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cerradas" fill={CHART_COLORS.success} name="Cerradas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard description="Tareas cerradas según si se cerraron antes o después de su fecha objetivo" title="Cumplimiento de la fecha objetivo">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={flujo}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="label" tick={axisTick} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={cursorStyle} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="aTiempo" fill={CHART_COLORS.success} name="A tiempo" stackId="c" stroke="var(--surface)" strokeWidth={1} />
                <Bar dataKey="tarde" fill={CHART_COLORS.danger} name="Con retraso" stackId="c" stroke="var(--surface)" strokeWidth={1} />
                <Bar dataKey="sinObjetivo" fill={CHART_COLORS.muted} name="Sin fecha objetivo" radius={[4, 4, 0, 0]} stackId="c" stroke="var(--surface)" strokeWidth={1} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Seccion>

      <Seccion description="Tareas abiertas ahora más las cerradas en el periodo." title="Composición del trabajo">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          <ChartCard description="Abiertas y cerradas/canceladas en el periodo" title="Por estado">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={porEstado} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis allowDecimals={false} axisLine={{ stroke: "var(--border)" }} tick={axisTick} tickLine={false} type="number" />
                <YAxis axisLine={false} dataKey="estado" tick={axisTick} tickLine={false} type="category" width={110} />
                <Tooltip {...tooltipStyle} cursor={cursorStyle} />
                <Bar dataKey="cantidad" name="Tareas" radius={[0, 4, 4, 0]}>
                  {porEstado.map((e) => (
                    <Cell key={e.estado} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard description="Solo tareas abiertas" title="Por prioridad">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={porPrioridad}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="prioridad" tick={axisTick} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={cursorStyle} />
                <Bar dataKey="cantidad" name="Tareas abiertas" radius={[4, 4, 0, 0]}>
                  {porPrioridad.map((p) => (
                    <Cell key={p.prioridad} fill={p.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard description="Abiertas frente a cerradas en el periodo" title="Por tipo">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={porTipo} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis allowDecimals={false} axisLine={{ stroke: "var(--border)" }} tick={axisTick} tickLine={false} type="number" />
                <YAxis axisLine={false} dataKey="tipo" tick={axisTick} tickLine={false} type="category" width={120} />
                <Tooltip {...tooltipStyle} cursor={cursorStyle} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="abiertas" fill={CHART_COLORS.accent} name="Abiertas" stackId="t" stroke="var(--surface)" strokeWidth={1} />
                <Bar dataKey="cerradas" fill={CHART_COLORS.success} name="Cerradas" radius={[0, 4, 4, 0]} stackId="t" stroke="var(--surface)" strokeWidth={1} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard description="Días naturales de media entre inicio y cierre, tareas cerradas en el periodo" title="Lead time por tipo">
            {leadTimePorTipo.length === 0 ? (
              <Vacio>No hay tareas cerradas con fecha de inicio en el periodo.</Vacio>
            ) : (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={leadTimePorTipo} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis axisLine={{ stroke: "var(--border)" }} tick={axisTick} tickLine={false} type="number" unit=" d" />
                  <YAxis axisLine={false} dataKey="tipo" tick={axisTick} tickLine={false} type="category" width={120} />
                  <Tooltip {...tooltipStyle} cursor={cursorStyle} />
                  <Bar dataKey="dias" fill={CHART_COLORS.accent} name="Lead time medio" radius={[0, 4, 4, 0]} unit=" días" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </Seccion>

      <Seccion description="Capacidad del periodo descontando vacaciones y festivos, frente a las horas asignadas." title="Personas y capacidad">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            description={
              proyectoId
                ? "Con filtro de proyecto, la carga solo incluye las tareas de ese proyecto. Estimaciones repartidas por días laborables entre inicio y objetivo."
                : "Capacidad = disponibilidad semanal × días laborables sin ausencias. Las estimaciones se reparten por días laborables entre inicio y objetivo."
            }
            height={alturaFilas(capacidad.length)}
            title="Carga vs. capacidad del periodo"
          >
            {!desde || !hasta ? (
              <Vacio>Selecciona un rango de fechas para calcular la capacidad.</Vacio>
            ) : capacidad.length === 0 ? (
              <Vacio>No hay personas en el alcance seleccionado.</Vacio>
            ) : (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart barGap={2} data={capacidad} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis axisLine={{ stroke: "var(--border)" }} tick={axisTick} tickLine={false} type="number" unit="h" />
                  <YAxis axisLine={false} dataKey="nombre" tick={axisTick} tickLine={false} type="category" width={120} />
                  <Tooltip
                    {...tooltipStyle}
                    cursor={cursorStyle}
                    labelFormatter={(label) => {
                      const fila = capacidad.find((c) => c.nombre === label);
                      if (!fila) return String(label);
                      const extra = [fila.ocupacion !== null ? `${fila.ocupacion}% ocupación` : null, fila.ausencias ? `${fila.ausencias} días de ausencia` : null]
                        .filter(Boolean)
                        .join(" · ");
                      return extra ? `${fila.nombre} (${extra})` : fila.nombre;
                    }}
                  />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="capacidad" fill={CHART_COLORS.muted} name="Capacidad" radius={[0, 4, 4, 0]} unit="h" />
                  <Bar dataKey="planificada" fill={CHART_COLORS.accent} name="Asignada (con fechas)" stackId="carga" stroke="var(--surface)" strokeWidth={1} unit="h" />
                  <Bar dataKey="sinFechas" fill={CHART_COLORS.warning} name="Abiertas sin fechas" radius={[0, 4, 4, 0]} stackId="carga" stroke="var(--surface)" strokeWidth={1} unit="h" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            description="Tareas abiertas vencidas o bloqueadas por responsable (top 10, situación actual)"
            height={alturaFilas(incidenciasPorPersona.length)}
            title="Vencidas y bloqueadas por persona"
          >
            {incidenciasPorPersona.length === 0 ? (
              <Vacio>Ninguna tarea vencida ni bloqueada.</Vacio>
            ) : (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={incidenciasPorPersona} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis allowDecimals={false} axisLine={{ stroke: "var(--border)" }} tick={axisTick} tickLine={false} type="number" />
                  <YAxis axisLine={false} dataKey="nombre" tick={axisTick} tickLine={false} type="category" width={120} />
                  <Tooltip {...tooltipStyle} cursor={cursorStyle} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="vencidas" fill={CHART_COLORS.danger} name="Vencidas" stackId="i" stroke="var(--surface)" strokeWidth={1} />
                  <Bar dataKey="bloqueadas" fill={CHART_COLORS.warning} name="Bloqueadas" radius={[0, 4, 4, 0]} stackId="i" stroke="var(--surface)" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </Seccion>

      <Seccion description="Estado de la cartera, proyectos con incidencias, hitos del periodo, riesgos abiertos y calendario." title="Proyectos, hitos y riesgos">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <ChartCard description="Proyectos del alcance seleccionado" title="Proyectos por estado">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={proyectosPorEstado}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="estado" tick={axisTick} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={cursorStyle} />
                <Bar dataKey="cantidad" name="Proyectos" radius={[4, 4, 0, 0]}>
                  {proyectosPorEstado.map((e) => (
                    <Cell key={e.estado} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            className="2xl:col-span-2"
            description="Proyectos no cerrados con tareas vencidas, bloqueadas o riesgos altos abiertos (top 10)"
            title="Salud de los proyectos"
          >
            {saludProyectos.length === 0 ? (
              <Vacio>Ningún proyecto activo con incidencias.</Vacio>
            ) : (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={saludProyectos}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="nombre" interval={0} tick={{ ...axisTick, fontSize: 11 }} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
                  <Tooltip
                    {...tooltipStyle}
                    cursor={cursorStyle}
                    labelFormatter={(label) => {
                      const p = saludProyectos.find((s) => s.nombre === label);
                      return p ? `${p.nombre} · ${p.proyecto}` : String(label);
                    }}
                  />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="vencidas" fill={CHART_COLORS.danger} name="Tareas vencidas" stackId="s" stroke="var(--surface)" strokeWidth={1} />
                  <Bar dataKey="bloqueadas" fill={CHART_COLORS.warning} name="Tareas bloqueadas" stackId="s" stroke="var(--surface)" strokeWidth={1} />
                  <Bar dataKey="riesgos" fill={CHART_COLORS.accent} name="Riesgos altos" radius={[4, 4, 0, 0]} stackId="s" stroke="var(--surface)" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <Card className="gap-3">
            <Card.Header>
              <Card.Title>Hitos del periodo</Card.Title>
              <Card.Description>Retrasado = marcado así o con fecha pasada sin completar</Card.Description>
            </Card.Header>
            <Card.Content>
              {hitos.length === 0 ? (
                <div className="h-48">
                  <Vacio>No hay hitos en el periodo.</Vacio>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="h-44 w-full">
                    <ResponsiveContainer height="100%" width="100%">
                      <BarChart data={hitosResumen.grupos}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="estado" tick={axisTick} tickLine={false} />
                        <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
                        <Tooltip {...tooltipStyle} cursor={cursorStyle} />
                        <Bar dataKey="cantidad" name="Hitos" radius={[4, 4, 0, 0]}>
                          {hitosResumen.grupos.map((g) => (
                            <Cell key={g.estado} fill={g.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {hitosResumen.retrasados.length ? (
                    <ul className="flex flex-col gap-1 text-sm">
                      {hitosResumen.retrasados.map((h) => (
                        <li key={h.id} className="flex justify-between gap-2">
                          <span className="truncate">
                            <span className="text-muted">{h.proyectoCodigo}</span> · {h.nombre}
                          </span>
                          <span className="shrink-0 text-danger">{formatFecha(h.fecha)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </Card.Content>
          </Card>

          <Card className="gap-3">
            <Card.Header>
              <Card.Title>Matriz de riesgos abiertos</Card.Title>
              <Card.Description>Impacto × probabilidad (sin mitigados ni cerrados)</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1 text-sm">
                <span />
                {PROBABILIDADES.map((p) => (
                  <span key={p} className="pb-1 text-center text-xs text-muted">
                    {PROBABILIDAD_LABEL[p]}
                  </span>
                ))}
                {matrizRiesgos.map((fila, i) => (
                  <div key={fila.impacto} className="contents">
                    <span className="flex items-center pr-2 text-xs text-muted">{IMPACTO_LABEL[fila.impacto]}</span>
                    {fila.celdas.map((c, j) => {
                      const severidad = (IMPACTOS.length - i) * (j + 1);
                      const color = severidad >= 8 ? "var(--danger)" : severidad >= 4 ? "var(--warning)" : "var(--success)";
                      return (
                        <div
                          key={c.prob}
                          className="flex h-12 items-center justify-center rounded-md font-semibold"
                          style={{ backgroundColor: c.n ? `color-mix(in oklab, ${color} 28%, transparent)` : "var(--surface-secondary)" }}
                          title={`${IMPACTO_LABEL[fila.impacto]} · probabilidad ${PROBABILIDAD_LABEL[c.prob].toLowerCase()}: ${c.n}`}
                        >
                          {c.n || <span className="text-muted">·</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <span />
                <span className="col-span-3 pt-1 text-center text-xs text-muted">Probabilidad →</span>
              </div>
            </Card.Content>
          </Card>

          <ChartCard description="Eventos del calendario en el periodo" height={220} title="Eventos por tipo">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={eventosPorTipo}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="tipo" tick={axisTick} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={cursorStyle} />
                <Bar dataKey="cantidad" name="Eventos" radius={[4, 4, 0, 0]}>
                  {eventosPorTipo.map((e) => (
                    <Cell key={e.tipo} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Seccion>
    </div>
  );
}
