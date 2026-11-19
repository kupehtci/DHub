import { Button, Checkbox, Spinner } from "@heroui/react";
import { addDays, differenceInCalendarDays, format, isWeekend, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import { GanttLegend, LegendArrow, type GanttLegendGroup } from "../components/GanttLegend";
import { colorForId, initialsFor } from "../components/PersonaAvatar";
import { SelectField } from "../components/SelectField";
import { TareaFormModal, type TareaDefaults } from "../components/TareaFormModal";
import { equiposApi, personasApi, proyectosApi, tareasApi } from "../lib/api";
import { ESTADO_TAREA_GANTT_COLOR, ESTADO_TAREA_LABEL, PRIORIDAD_GANTT_COLOR, PRIORIDAD_LABEL } from "../lib/format";
import {
  ESTADOS_TAREA,
  type Equipo,
  type EstadoTarea,
  type Persona,
  type Prioridad,
  type Proyecto,
  type Tarea,
  type TareaDependencia,
} from "../types";

type Vista = "persona" | "equipo" | "proyecto";
type Agrupacion = "persona" | "proyecto" | "ninguna";
type Escala = "dia" | "semana" | "mes";
type ModoArrastre = "inicio" | "fin" | "mover";

const DIA_PX: Record<Escala, number> = { dia: 40, semana: 20, mes: 8 };
const ESCALA_LABEL: Record<Escala, string> = { dia: "Días", semana: "Semanas", mes: "Meses" };
const VISTA_LABEL: Record<Vista, string> = { persona: "Por persona", equipo: "Por equipo", proyecto: "Por proyecto" };
const AGRUPACION_POR_VISTA: Record<Vista, Agrupacion> = { persona: "proyecto", equipo: "persona", proyecto: "persona" };

const LEFT_W = 300;
const ROW_H = 36;
const GROUP_H = 30;
const HEADER_H = 52;
const BAR_H = 20;
const HANDLE_W = 7;
const HORAS_POR_DIA = 8;
// Zona libre bajo la última fila para poder crear tareas aunque no haya ninguna.
const HUECO_FINAL_H = ROW_H * 3;

interface TareaPlanificada {
  tarea: Tarea;
  inicio: Date;
  fin: Date;
  // true si alguna de las fechas se ha deducido de la estimación en lugar de venir informada.
  estimada: boolean;
}

// Persona y proyecto asociados a una fila: se usan como valores por defecto al crear una tarea
// haciendo clic en un hueco de esa fila.
interface ContextoFila {
  responsableId?: string | null;
  proyectoId?: string | null;
}

type Fila =
  | { tipo: "grupo"; key: string; label: string; colorId: string | null; total: number; y: number; contexto: ContextoFila }
  | { tipo: "tarea"; key: string; item: TareaPlanificada; y: number; contexto: ContextoFila };

interface Arrastre {
  id: string;
  modo: ModoArrastre;
  startX: number;
  delta: number;
  movido: boolean;
}

// Duración en días laborables a partir de la estimación en horas (mínimo un día).
const diasDeEstimacion = (horas: number) => Math.max(1, Math.ceil((horas || 0) / HORAS_POR_DIA));
const aIso = (d: Date) => format(d, "yyyy-MM-dd");

interface Rango {
  inicio: Date;
  fin: Date;
}

// Rango efectivo de una tarea a partir de sus fechas; si falta una, se deduce de la estimación.
function rangoDeFechas(
  fechaInicio: string | null,
  fechaObjetivo: string | null,
  estimacionHoras: number,
): (Rango & { estimada: boolean }) | null {
  const ini = fechaInicio ? startOfDay(parseISO(fechaInicio)) : null;
  const fin = fechaObjetivo ? startOfDay(parseISO(fechaObjetivo)) : null;
  if (ini && fin) return fin < ini ? { inicio: fin, fin: ini, estimada: false } : { inicio: ini, fin, estimada: false };
  const dias = diasDeEstimacion(estimacionHoras);
  if (ini) return { inicio: ini, fin: addDays(ini, dias - 1), estimada: true };
  if (fin) return { inicio: addDays(fin, -(dias - 1)), fin, estimada: true };
  return null;
}

function planificar(t: Tarea): TareaPlanificada | null {
  const r = rangoDeFechas(t.fechaInicio, t.fechaObjetivo, t.estimacionHoras);
  return r ? { tarea: t, ...r } : null;
}

// ---- Días laborables (solo se descartan fines de semana) ----
const siguienteLaborable = (d: Date) => {
  let x = addDays(d, 1);
  while (isWeekend(x)) x = addDays(x, 1);
  return x;
};
const contarLaborables = (ini: Date, fin: Date) => {
  let n = 0;
  for (let x = ini; x <= fin; x = addDays(x, 1)) if (!isWeekend(x)) n++;
  return Math.max(1, n);
};
// Fecha en la que acaba un trabajo de `n` días laborables que empieza en `ini` (laborable).
const finTrasLaborables = (ini: Date, n: number) => {
  let x = ini;
  for (let c = 1; c < n; ) {
    x = addDays(x, 1);
    if (!isWeekend(x)) c++;
  }
  return x;
};

const esCerrada = (estado: EstadoTarea | undefined) => estado === "Hecha" || estado === "Cancelada";
const fechaCorta = (d: Date) => format(d, "d MMM", { locale: es });

// Dependencia fin → inicio: `pred` debe terminar antes de que empiece `succ`.
interface Dependencia {
  pred: string;
  succ: string;
}
const claveDep = (d: Dependencia) => `${d.pred}>${d.succ}`;

// Dependencia que un arrastre ha hecho incumplir (o ha empeorado).
interface AvisoDependencia extends Dependencia {
  predTitulo: string;
  succTitulo: string;
}

const COLOR_DEPENDENCIA = "var(--foreground)";
const COLOR_DEPENDENCIA_INCUMPLIDA = "var(--danger)";
// Separación horizontal de los codos de la flecha de dependencia.
const CODO = 8;

// Flecha ortogonal fin de la predecesora → inicio de la sucesora. Si la sucesora empieza antes
// de que acabe la predecesora, la flecha retrocede por el hueco entre filas.
function rutaDependencia(pa: { x2: number; yc: number }, pb: { x1: number; yc: number }) {
  const { x2: x1, yc: y1 } = pa;
  const { x1: x2, yc: y2 } = pb;
  if (x2 - x1 >= CODO * 2) return `M ${x1} ${y1} H ${x1 + CODO} V ${y2} H ${x2}`;
  const ym = y2 > y1 ? y2 - ROW_H / 2 : y2 + ROW_H / 2;
  return `M ${x1} ${y1} H ${x1 + CODO} V ${ym} H ${x2 - CODO} V ${y2} H ${x2}`;
}

// Aplica el desplazamiento (en días) de un arrastre en curso al rango de una tarea.
function rangoConArrastre(item: TareaPlanificada, arrastre: Arrastre | null): Rango {
  if (!arrastre || arrastre.id !== item.tarea.id || arrastre.delta === 0) return item;
  const { inicio, fin } = item;
  if (arrastre.modo === "mover") return { inicio: addDays(inicio, arrastre.delta), fin: addDays(fin, arrastre.delta) };
  if (arrastre.modo === "inicio") {
    const nuevo = addDays(inicio, arrastre.delta);
    return { inicio: nuevo > fin ? fin : nuevo, fin };
  }
  const nuevo = addDays(fin, arrastre.delta);
  return { inicio, fin: nuevo < inicio ? inicio : nuevo };
}

const PRIORIDADES = Object.keys(PRIORIDAD_LABEL) as Prioridad[];
// Rayas diagonales que marcan las barras cuya duración se ha deducido de la estimación.
const rayasEstimada = (paso: number) =>
  `repeating-linear-gradient(45deg, transparent 0 ${paso}px, rgba(255,255,255,0.3) ${paso}px ${paso * 2}px)`;
// Atenuación de las tareas canceladas (además se tacha su título).
const OPACIDAD_CANCELADA = 0.55;
// Halo de las tareas vencidas: separado de la barra para que se vea incluso sobre el rojo de "Bloqueada".
const HALO_VENCIDA = "outline-2 outline-offset-1 outline-danger";

const colorEstado = (estado: EstadoTarea) => ESTADO_TAREA_GANTT_COLOR[estado];

// Franja de prioridad del borde izquierdo de la barra, separada del color de estado por un filo blanco.
function FranjaPrioridad({ prioridad }: { prioridad: Prioridad }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0"
      style={{ width: 4, backgroundColor: PRIORIDAD_GANTT_COLOR[prioridad], boxShadow: "1px 0 0 rgba(255,255,255,0.9)" }}
    />
  );
}

// Distintivo ⚠ de las tareas que empiezan antes de que termine alguna predecesora.
function MarcaConflicto({ className = "", title, style }: { className?: string; title?: string; style?: React.CSSProperties }) {
  return (
    <span
      title={title}
      style={style}
      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[9px] font-bold leading-none text-white ring-1 ring-surface ${className}`}
    >
      !
    </span>
  );
}

// Leyenda: qué significa cada color y cada señal visual de las barras.
const LEYENDA: GanttLegendGroup[] = [
  {
    key: "estado",
    label: "Estado",
    items: ESTADOS_TAREA.map((e) => ({
      key: e,
      label: ESTADO_TAREA_LABEL[e],
      title: e === "Cancelada" ? "Barra atenuada y título tachado" : e === "Hecha" ? "El título lleva una ✓" : undefined,
      swatch: (
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: colorEstado(e), opacity: e === "Cancelada" ? OPACIDAD_CANCELADA : 1 }}
        />
      ),
    })),
  },
  {
    key: "prioridad",
    label: "Prioridad",
    items: PRIORIDADES.map((p) => ({
      key: p,
      label: PRIORIDAD_LABEL[p],
      title: "Franja del borde izquierdo de la barra",
      swatch: (
        <span className="relative h-2.5 w-4 overflow-hidden rounded-sm" style={{ backgroundColor: colorEstado("Backlog") }}>
          <FranjaPrioridad prioridad={p} />
        </span>
      ),
    })),
  },
  {
    key: "senales",
    items: [
      {
        key: "vencida",
        label: "Vencida",
        title: "Fecha objetivo superada sin haber terminado",
        swatch: <span className={`h-2.5 w-4 rounded-sm ${HALO_VENCIDA}`} style={{ backgroundColor: colorEstado("EnCurso") }} />,
      },
      {
        key: "estimada",
        label: "Duración estimada",
        title: "Falta la fecha de inicio u objetivo: la duración se deduce de la estimación en horas",
        swatch: (
          <span
            className="h-2.5 w-4 rounded-sm"
            style={{ backgroundColor: colorEstado("EnCurso"), backgroundImage: rayasEstimada(3) }}
          />
        ),
      },
      {
        key: "relacion",
        label: "Relación",
        title: "Une tareas relacionadas (sin orden obligatorio)",
        swatch: <LegendArrow opacity={0.6} />,
      },
      {
        key: "solapada",
        label: "Relación solapada",
        title: "La tarea relacionada empieza antes de que termine la anterior",
        swatch: <LegendArrow dashed opacity={0.6} />,
      },
      {
        key: "dependencia",
        label: "Dependencia: A debe terminar antes de B",
        title: "Flecha del final de la predecesora (A) al inicio de la sucesora (B)",
        swatch: <LegendArrow color={COLOR_DEPENDENCIA} strokeWidth={2} />,
      },
      {
        key: "incumplida",
        label: "Dependencia incumplida",
        title: "La sucesora empieza antes de que termine su predecesora (que no está hecha ni cancelada)",
        swatch: (
          <span className="flex items-center gap-0.5">
            <LegendArrow color={COLOR_DEPENDENCIA_INCUMPLIDA} strokeWidth={2} />
            <MarcaConflicto />
          </span>
        ),
      },
      { key: "hoy", label: "Hoy", swatch: <span className="h-3 w-0.5 bg-accent/70" /> },
    ],
  },
];

export default function TareasGanttPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vista, setVista] = useState<Vista>("equipo");
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [agrupacion, setAgrupacion] = useState<Agrupacion>(AGRUPACION_POR_VISTA.equipo);
  const [escala, setEscala] = useState<Escala>("dia");
  const [ocultarCerradas, setOcultarCerradas] = useState(true);
  const [soloConRelacion, setSoloConRelacion] = useState(false);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverCelda, setHoverCelda] = useState<{ y: number; h: number; dia: number } | null>(null);
  const [editTarea, setEditTarea] = useState<Tarea | null>(null);
  const [nuevaTarea, setNuevaTarea] = useState<TareaDefaults | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const arrastreRef = useRef<Arrastre | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const centradoInicial = useRef(false);
  // Aviso no bloqueante tras un arrastre que incumple (o empeora) alguna dependencia.
  const [aviso, setAviso] = useState<AvisoDependencia[] | null>(null);
  const [moviendoSucesoras, setMoviendoSucesoras] = useState(false);
  // Tarea resaltada momentáneamente al navegar por las dependencias incumplidas.
  const [destacadaId, setDestacadaId] = useState<string | null>(null);
  const indiceConflicto = useRef(0);

  const cargar = () => {
    setLoading((prev) => prev || tareas.length === 0);
    tareasApi
      .listar({
        responsableId: vista === "persona" ? (seleccion ?? undefined) : undefined,
        equipoId: vista === "equipo" ? (seleccion ?? undefined) : undefined,
        proyectoId: vista === "proyecto" ? (seleccion ?? undefined) : undefined,
      })
      .then((r) => setTareas(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    proyectosApi.listar().then((r) => setProyectos(r.data));
    equiposApi.listar().then((r) => setEquipos(r.data));
    personasApi.listar().then((r) => setPersonas(r.data));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(cargar, [vista, seleccion]);

  const cambiarVista = (v: Vista) => {
    setVista(v);
    setSeleccion(null);
    setAgrupacion(AGRUPACION_POR_VISTA[v]);
  };

  const opcionesSeleccion =
    vista === "persona"
      ? personas.map((p) => ({ id: p.id, label: p.nombre }))
      : vista === "equipo"
        ? equipos.map((e) => ({ id: e.id, label: e.nombre }))
        : proyectos.map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` }));

  const visibles = useMemo(() => {
    let lista = tareas;
    if (ocultarCerradas) lista = lista.filter((t) => t.estado !== "Hecha" && t.estado !== "Cancelada");
    if (soloConRelacion)
      lista = lista.filter((t) => t.relacionadas.length > 0 || t.bloqueadaPor.length > 0 || t.bloquea.length > 0);
    return lista;
  }, [tareas, ocultarCerradas, soloConRelacion]);

  // ---- Dependencias (fin → inicio) ----

  const tareasPorId = useMemo(() => new Map(tareas.map((t) => [t.id, t])), [tareas]);

  // Pares predecesora → sucesora deducidos de `bloqueadaPor` y `bloquea` de las tareas cargadas
  // (deduplicados), y los datos resumidos de las tareas enlazadas que no están cargadas.
  const dependencias = useMemo(() => {
    const info = new Map<string, TareaDependencia>();
    const pares = new Map<string, Dependencia>();
    const add = (d: Dependencia) => pares.set(claveDep(d), d);
    tareas.forEach((t) => {
      (t.bloqueadaPor ?? []).forEach((p) => {
        info.set(p.id, p);
        add({ pred: p.id, succ: t.id });
      });
      (t.bloquea ?? []).forEach((x) => {
        info.set(x.id, x);
        add({ pred: t.id, succ: x.id });
      });
    });
    const lista = [...pares.values()];
    // Pares (sin orden) que ya se dibujan como dependencia, para no duplicarlos como relación.
    const noOrdenados = new Set(lista.map((d) => [d.pred, d.succ].sort().join("|")));
    return { info, pares: lista, noOrdenados };
  }, [tareas]);

  const tituloDe = (id: string) => tareasPorId.get(id)?.titulo ?? dependencias.info.get(id)?.titulo ?? "(tarea)";
  const cerrada = (id: string) => esCerrada(tareasPorId.get(id)?.estado ?? dependencias.info.get(id)?.estado);

  // Rango efectivo de cualquier tarea enlazada (aplicando el arrastre indicado si es la arrastrada).
  // Para las tareas no cargadas se usan las fechas resumidas que trae la dependencia.
  const rangoDe = (id: string, arr: Arrastre | null): Rango | null => {
    const t = tareasPorId.get(id);
    if (t) {
      const p = planificar(t);
      return p ? rangoConArrastre(p, arr) : null;
    }
    const d = dependencias.info.get(id);
    return d ? rangoDeFechas(d.fechaInicio, d.fechaObjetivo, 0) : null;
  };

  // Días en los que la sucesora se solapa con su predecesora (0 si la dependencia se cumple o
  // si la predecesora ya está hecha o cancelada).
  const solape = (d: Dependencia, arr: Arrastre | null) => {
    if (cerrada(d.pred)) return 0;
    const rp = rangoDe(d.pred, arr);
    const rs = rangoDe(d.succ, arr);
    if (!rp || !rs) return 0;
    return Math.max(0, differenceInCalendarDays(rp.fin, rs.inicio) + 1);
  };

  const { planificadas, sinFechas } = useMemo(() => {
    const planificadas: TareaPlanificada[] = [];
    const sinFechas: Tarea[] = [];
    visibles.forEach((t) => {
      const p = planificar(t);
      if (p) planificadas.push(p);
      else sinFechas.push(t);
    });
    planificadas.sort((a, b) => a.inicio.getTime() - b.inicio.getTime() || a.fin.getTime() - b.fin.getTime());
    return { planificadas, sinFechas };
  }, [visibles]);

  // Rango visible: desde la primera fecha hasta la última, con margen, incluyendo siempre hoy.
  const hoy = startOfDay(new Date());
  const { desde, numDias } = useMemo(() => {
    let min = addDays(hoy, -7);
    let max = addDays(hoy, 28);
    planificadas.forEach((p) => {
      if (p.inicio < min) min = p.inicio;
      if (p.fin > max) max = p.fin;
    });
    const desde = addDays(min, -7);
    return { desde, numDias: differenceInCalendarDays(addDays(max, 14), desde) + 1 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planificadas]);

  const diaPx = DIA_PX[escala];
  const anchoTimeline = numDias * diaPx;
  const xDe = (d: Date) => differenceInCalendarDays(d, desde) * diaPx;

  const filas = useMemo<Fila[]>(() => {
    const resultado: Fila[] = [];
    let y = 0;
    const pushTareas = (items: TareaPlanificada[]) =>
      items.forEach((item) => {
        const contexto = { responsableId: item.tarea.responsableId, proyectoId: item.tarea.proyectoId };
        resultado.push({ tipo: "tarea", key: item.tarea.id, item, y, contexto });
        y += ROW_H;
      });

    if (agrupacion === "ninguna") {
      pushTareas(planificadas);
      return resultado;
    }

    const grupos = new Map<string, { label: string; colorId: string | null; items: TareaPlanificada[] }>();
    planificadas.forEach((p) => {
      const t = p.tarea;
      const key = agrupacion === "persona" ? (t.responsableId ?? "__sin__") : t.proyectoId;
      const label =
        agrupacion === "persona" ? (t.responsableNombre ?? "Sin responsable") : `${t.proyectoCodigo} · ${t.proyectoNombre}`;
      if (!grupos.has(key)) grupos.set(key, { label, colorId: agrupacion === "persona" ? t.responsableId : null, items: [] });
      grupos.get(key)!.items.push(p);
    });

    [...grupos.entries()]
      .sort(([ka, a], [kb, b]) => (ka === "__sin__" ? 1 : kb === "__sin__" ? -1 : a.label.localeCompare(b.label)))
      .forEach(([key, g]) => {
        const contexto: ContextoFila =
          agrupacion === "persona" ? { responsableId: key === "__sin__" ? null : key } : { proyectoId: key };
        resultado.push({ tipo: "grupo", key: `g-${key}`, label: g.label, colorId: g.colorId, total: g.items.length, y, contexto });
        y += GROUP_H;
        pushTareas(g.items);
      });
    return resultado;
  }, [planificadas, agrupacion]);

  const altoFilas = filas.reduce((acc, f) => acc + (f.tipo === "grupo" ? GROUP_H : ROW_H), 0);
  const altoCuerpo = altoFilas + HUECO_FINAL_H;

  // Posición de cada barra (incluyendo el arrastre en curso), para trazar los conectores.
  const barras = useMemo(() => {
    const m = new Map<string, { x1: number; x2: number; yc: number }>();
    filas.forEach((f) => {
      if (f.tipo !== "tarea") return;
      const r = rangoConArrastre(f.item, arrastre);
      m.set(f.item.tarea.id, { x1: xDe(r.inicio), x2: xDe(r.fin) + diaPx, yc: f.y + ROW_H / 2 });
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, diaPx, desde, arrastre]);

  // Las relaciones se guardan en ambos sentidos: se deduplican y se dibujan de la que
  // empieza antes hacia la que empieza después.
  const conectores = useMemo(() => {
    const vistos = new Set<string>();
    const lista: { a: string; b: string }[] = [];
    visibles.forEach((t) =>
      t.relacionadas.forEach((r) => {
        if (!barras.has(t.id) || !barras.has(r.id)) return;
        const clave = [t.id, r.id].sort().join("|");
        // Si además son dependencia, se dibuja solo la flecha de dependencia.
        if (vistos.has(clave) || dependencias.noOrdenados.has(clave)) return;
        vistos.add(clave);
        const [a, b] = barras.get(t.id)!.x1 <= barras.get(r.id)!.x1 ? [t.id, r.id] : [r.id, t.id];
        lista.push({ a, b });
      }),
    );
    return lista;
  }, [visibles, barras, dependencias]);

  // Dependencias incumplidas, recalculadas en vivo durante el arrastre.
  const incumplidas = dependencias.pares.filter((d) => solape(d, arrastre) > 0);
  const clavesIncumplidas = new Set(incumplidas.map(claveDep));
  // Por cada sucesora, las predecesoras que todavía no han terminado cuando ella empieza.
  const conflictosPorTarea = new Map<string, string[]>();
  incumplidas.forEach((d) => {
    const rp = rangoDe(d.pred, arrastre);
    const texto = `«${tituloDe(d.pred)}»${rp ? ` (termina el ${fechaCorta(rp.fin)})` : ""}`;
    conflictosPorTarea.set(d.succ, [...(conflictosPorTarea.get(d.succ) ?? []), texto]);
  });
  // Solo se dibujan las dependencias con ambas tareas visibles en la vista actual.
  const flechasDep = dependencias.pares.filter((d) => barras.has(d.pred) && barras.has(d.succ));
  // Sucesoras con conflicto visibles, en orden de aparición, para recorrerlas desde el resumen.
  const conflictosVisibles = [...new Set(incumplidas.map((d) => d.succ))]
    .filter((id) => barras.has(id))
    .sort((a, b) => barras.get(a)!.yc - barras.get(b)!.yc);
  // El aviso de arrastre solo muestra lo que sigue incumplido.
  const avisoVigente = aviso?.filter((x) => clavesIncumplidas.has(claveDep(x))) ?? [];

  const relacionadasConHover = useMemo(() => {
    if (!hoverId) return null;
    const t = tareas.find((x) => x.id === hoverId);
    const ids = new Set([hoverId, ...(t?.relacionadas.map((r) => r.id) ?? [])]);
    dependencias.pares.forEach((d) => {
      if (d.pred === hoverId) ids.add(d.succ);
      if (d.succ === hoverId) ids.add(d.pred);
    });
    return ids;
  }, [hoverId, tareas, dependencias]);

  const dias = useMemo(() => Array.from({ length: numDias }, (_, i) => addDays(desde, i)), [desde, numDias]);
  const meses = useMemo(() => {
    const lista: { label: string; x: number; w: number }[] = [];
    dias.forEach((d, i) => {
      const label = format(d, "MMMM yyyy", { locale: es });
      const ultimo = lista[lista.length - 1];
      if (ultimo && ultimo.label === label) ultimo.w += diaPx;
      else lista.push({ label, x: i * diaPx, w: diaPx });
    });
    return lista;
  }, [dias, diaPx]);

  const irAHoy = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: Math.max(0, xDe(hoy) - (el.clientWidth - LEFT_W) / 3), behavior: "smooth" });
  };

  // Centra la vista en hoy la primera vez que se pinta y al cambiar de escala, pero no tras
  // cada recarga (p. ej. al guardar una tarea), para no perder la posición del usuario.
  useEffect(() => {
    if (loading) return;
    if (!centradoInicial.current) {
      centradoInicial.current = true;
      irAHoy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => irAHoy(), [escala]);

  // ---- Arrastre de barras (mover o cambiar fecha de inicio / fin) ----

  const empezarArrastre = (e: React.PointerEvent, id: string, modo: ModoArrastre) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const a: Arrastre = { id, modo, startX: e.clientX, delta: 0, movido: false };
    arrastreRef.current = a;
    setArrastre(a);
  };

  const arrastrando = arrastre !== null;
  useEffect(() => {
    if (!arrastrando) return;

    const onMove = (e: PointerEvent) => {
      const a = arrastreRef.current;
      if (!a) return;
      const dx = e.clientX - a.startX;
      const delta = Math.round(dx / diaPx);
      const movido = a.movido || Math.abs(dx) > 3;
      if (delta === a.delta && movido === a.movido) return;
      const sig = { ...a, delta, movido };
      arrastreRef.current = sig;
      setArrastre(sig);
    };

    const onUp = () => {
      const a = arrastreRef.current;
      arrastreRef.current = null;
      setArrastre(null);
      if (!a) return;
      const item = planificadas.find((p) => p.tarea.id === a.id);
      if (!item) return;

      // Un clic sin desplazamiento sobre la barra abre la tarea para editarla.
      if (!a.movido) {
        if (a.modo === "mover") setEditTarea(item.tarea);
        return;
      }
      if (a.delta === 0) return;

      const { inicio, fin } = rangoConArrastre(item, a);
      // Dependencias de la tarea arrastrada que pasan a incumplirse o se incumplen más que antes.
      // No se bloquea el cambio: solo se avisa.
      const nuevas = dependencias.pares.filter((d) => (d.pred === a.id || d.succ === a.id) && solape(d, a) > solape(d, null));
      if (nuevas.length > 0)
        setAviso(nuevas.map((d) => ({ ...d, predTitulo: tituloDe(d.pred), succTitulo: tituloDe(d.succ) })));
      const fechaInicio = aIso(inicio);
      const fechaObjetivo = aIso(fin);
      // Actualización optimista: se pinta ya y, si falla, se recarga desde el servidor.
      setTareas((prev) => prev.map((t) => (t.id === a.id ? { ...t, fechaInicio, fechaObjetivo } : t)));
      setError(null);
      tareasApi.cambiarFechas(a.id, fechaInicio, fechaObjetivo).catch(() => {
        setError("No se han podido guardar las nuevas fechas de la tarea.");
        cargar();
      });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrastrando, diaPx, planificadas, dependencias]);

  // Desplaza las sucesoras del aviso para que empiecen el día laborable siguiente al fin de la
  // última de sus predecesoras pendientes, conservando su duración en días laborables.
  const moverSucesoras = () => {
    const cambios: { id: string; fechaInicio: string; fechaObjetivo: string }[] = [];
    new Set(avisoVigente.map((x) => x.succ)).forEach((succ) => {
      const rs = rangoDe(succ, null);
      if (!rs) return;
      let finPred: Date | null = null;
      for (const d of dependencias.pares) {
        if (d.succ !== succ || cerrada(d.pred)) continue;
        const rp = rangoDe(d.pred, null);
        if (rp && (!finPred || rp.fin > finPred)) finPred = rp.fin;
      }
      if (!finPred || rs.inicio > finPred) return;
      const inicio = siguienteLaborable(finPred);
      const fin = finTrasLaborables(inicio, contarLaborables(rs.inicio, rs.fin));
      cambios.push({ id: succ, fechaInicio: aIso(inicio), fechaObjetivo: aIso(fin) });
    });
    if (cambios.length === 0) {
      setAviso(null);
      return;
    }
    setMoviendoSucesoras(true);
    setError(null);
    const porId = new Map(cambios.map((c) => [c.id, c]));
    setTareas((prev) => prev.map((t) => (porId.has(t.id) ? { ...t, ...porId.get(t.id)! } : t)));
    Promise.all(cambios.map((c) => tareasApi.cambiarFechas(c.id, c.fechaInicio, c.fechaObjetivo)))
      .then(() => setAviso(null))
      .catch(() => setError("No se han podido mover todas las tareas sucesoras."))
      .finally(() => {
        setMoviendoSucesoras(false);
        // Se recarga para refrescar también las fechas resumidas de las dependencias.
        cargar();
      });
  };

  // Recorre las dependencias incumplidas visibles: desplaza la vista hasta la siguiente
  // sucesora afectada y la resalta un momento.
  const irAConflicto = () => {
    const el = scrollRef.current;
    if (!el || conflictosVisibles.length === 0) return;
    const id = conflictosVisibles[indiceConflicto.current % conflictosVisibles.length];
    indiceConflicto.current++;
    const b = barras.get(id)!;
    el.scrollTo({
      left: Math.max(0, b.x1 - (el.clientWidth - LEFT_W) / 3),
      top: Math.max(0, HEADER_H + b.yc - el.clientHeight / 2),
      behavior: "smooth",
    });
    setDestacadaId(id);
  };

  useEffect(() => {
    if (!destacadaId) return;
    const t = setTimeout(() => setDestacadaId(null), 2000);
    return () => clearTimeout(t);
  }, [destacadaId]);

  // ---- Creación de tareas haciendo clic en un hueco ----

  const diaEnPuntero = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(numDias - 1, Math.floor((e.clientX - rect.left) / diaPx)));
  };

  const proyectosDelEquipo = useMemo(
    () => (vista === "equipo" && seleccion ? proyectos.filter((p) => p.equipoId === seleccion) : proyectos),
    [vista, seleccion, proyectos],
  );

  const crearEn = (dia: number, contexto: ContextoFila) => {
    const fecha = aIso(addDays(desde, dia));
    let proyectoId = contexto.proyectoId ?? null;
    let responsableId = contexto.responsableId ?? null;
    if (!proyectoId && vista === "proyecto") proyectoId = seleccion;
    if (!proyectoId && vista === "equipo" && proyectosDelEquipo.length === 1) proyectoId = proyectosDelEquipo[0].id;
    if (!responsableId && vista === "persona") responsableId = seleccion;
    setNuevaTarea({ proyectoId, responsableId, fechaInicio: fecha, fechaObjetivo: fecha });
  };

  const atenuada = (id: string) => relacionadasConHover !== null && !relacionadasConHover.has(id);

  // Capa clicable sobre la parte de línea de tiempo de una fila: resalta la celda bajo el
  // cursor y crea una tarea en ese día al hacer clic.
  const capaCrear = (y: number, h: number, contexto: ContextoFila) => (
    <div
      className="absolute top-0 h-full cursor-cell"
      style={{ left: LEFT_W, width: anchoTimeline }}
      onMouseMove={(e) => {
        if (arrastre) return;
        const dia = diaEnPuntero(e);
        if (!hoverCelda || hoverCelda.dia !== dia || hoverCelda.y !== y) setHoverCelda({ y, h, dia });
      }}
      onMouseLeave={() => setHoverCelda(null)}
      onClick={(e) => crearEn(diaEnPuntero(e), contexto)}
    />
  );

  const contextoFiltro: ContextoFila = {
    responsableId: vista === "persona" ? seleccion : null,
    proyectoId: vista === "proyecto" ? seleccion : null,
  };

  const editando = editTarea !== null;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gantt de tareas</h1>
          <p className="text-sm text-muted">
            Arrastra los bordes de una barra para cambiar sus fechas o la barra entera para moverla. Haz clic en un hueco para crear
            una tarea ese día. Las flechas finas unen tareas relacionadas y las gruesas marcan dependencias (la predecesora debe
            terminar antes de que empiece la sucesora).
          </p>
        </div>
        <div className="flex gap-1">
          {(Object.keys(VISTA_LABEL) as Vista[]).map((v) => (
            <Button key={v} size="sm" variant={vista === v ? "primary" : "secondary"} onPress={() => cambiarVista(v)}>
              {VISTA_LABEL[v]}
            </Button>
          ))}
        </div>
      </div>

      <GanttLegend groups={LEYENDA} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <SelectField
            label={vista === "persona" ? "Persona" : vista === "equipo" ? "Equipo" : "Proyecto"}
            emptyOption={vista === "persona" ? "Todas las personas" : vista === "equipo" ? "Todos los equipos" : "Todos los proyectos"}
            options={opcionesSeleccion}
            value={seleccion}
            onChange={setSeleccion}
          />
        </div>
        <div className="w-44">
          <SelectField
            label="Agrupar por"
            options={[
              { id: "persona", label: "Persona" },
              { id: "proyecto", label: "Proyecto" },
              { id: "ninguna", label: "Sin agrupar" },
            ]}
            value={agrupacion}
            onChange={(v) => setAgrupacion((v as Agrupacion) ?? "ninguna")}
          />
        </div>
        <div className="flex gap-1">
          {(Object.keys(DIA_PX) as Escala[]).map((e) => (
            <Button key={e} size="sm" variant={escala === e ? "primary" : "secondary"} onPress={() => setEscala(e)}>
              {ESCALA_LABEL[e]}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onPress={irAHoy}>
            Hoy
          </Button>
        </div>
        <Checkbox isSelected={ocultarCerradas} onChange={setOcultarCerradas}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Ocultar hechas y canceladas
          </Checkbox.Content>
        </Checkbox>
        <Checkbox isSelected={soloConRelacion} onChange={setSoloConRelacion}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Solo tareas con relación o dependencia
          </Checkbox.Content>
        </Checkbox>
        {incumplidas.length > 0 ? (
          <button
            type="button"
            onClick={irAConflicto}
            disabled={conflictosVisibles.length === 0}
            title={
              conflictosVisibles.length > 0
                ? "Ir a la siguiente tarea que empieza antes de que termine su predecesora"
                : "Las tareas afectadas no se ven con los filtros actuales"
            }
            className="flex items-center gap-1.5 self-center rounded-full border border-danger/40 bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-soft/70 disabled:cursor-default disabled:opacity-60"
          >
            <MarcaConflicto />
            {incumplidas.length} {incumplidas.length === 1 ? "dependencia incumplida" : "dependencias incumplidas"}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {avisoVigente.length > 0 ? (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-warning/50 bg-warning-soft px-4 py-3 text-sm">
          <span aria-hidden className="text-lg leading-none text-warning">
            ⚠
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Los cambios se han guardado, pero {avisoVigente.length === 1 ? "hay una dependencia" : `hay ${avisoVigente.length} dependencias`}{" "}
              que no se cumple{avisoVigente.length === 1 ? "" : "n"}:
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs">
              {avisoVigente.map((x) => (
                <li key={claveDep(x)}>
                  «{x.succTitulo}» empieza antes de que termine «{x.predTitulo}»
                </li>
              ))}
            </ul>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="secondary"
              isDisabled={moviendoSucesoras}
              onPress={moverSucesoras}
              aria-label="Mover las sucesoras al día laborable siguiente al fin de sus predecesoras"
            >
              {moviendoSucesoras ? <Spinner size="sm" /> : null}
              Mover sucesoras
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setAviso(null)}>
              Descartar
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className={`min-h-0 flex-1 select-none overflow-auto rounded-xl border border-border bg-surface ${
              arrastre ? (arrastre.modo === "mover" ? "cursor-grabbing" : "cursor-ew-resize") : ""
            }`}
          >
            <div className="relative" style={{ width: LEFT_W + anchoTimeline, height: HEADER_H + altoCuerpo }}>
              {/* Cabecera: meses y días */}
              <div className="sticky top-0 z-30 flex border-b border-border bg-surface" style={{ height: HEADER_H }}>
                <div
                  className="sticky left-0 z-40 flex items-end border-r border-border bg-surface px-3 pb-2 text-xs font-semibold text-muted"
                  style={{ width: LEFT_W, minWidth: LEFT_W }}
                >
                  Tarea
                </div>
                <div className="relative" style={{ width: anchoTimeline }}>
                  {meses.map((m) => (
                    <div
                      key={m.label + m.x}
                      className="absolute top-0 truncate border-l border-border px-2 pt-1 text-xs font-semibold capitalize"
                      style={{ left: m.x, width: m.w, height: HEADER_H / 2 }}
                    >
                      {m.label}
                    </div>
                  ))}
                  {dias.map((d, i) => {
                    const mostrar = diaPx >= 20 || d.getDay() === 1;
                    if (!mostrar) return null;
                    const esHoy = differenceInCalendarDays(d, hoy) === 0;
                    return (
                      <div
                        key={i}
                        className={`absolute flex flex-col items-center justify-center text-[10px] leading-tight ${
                          esHoy ? "font-bold text-accent" : isWeekend(d) ? "text-muted/60" : "text-muted"
                        }`}
                        style={{ left: i * diaPx, width: diaPx >= 20 ? diaPx : diaPx * 7, top: HEADER_H / 2, height: HEADER_H / 2 }}
                      >
                        {diaPx >= 40 ? <span>{format(d, "EEEEEE", { locale: es })}</span> : null}
                        <span>{format(d, "d")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fondo: fines de semana, línea de hoy y celda bajo el cursor */}
              <div className="pointer-events-none absolute" style={{ left: LEFT_W, top: HEADER_H, width: anchoTimeline, height: altoCuerpo }}>
                {dias.map((d, i) =>
                  isWeekend(d) ? (
                    <div key={i} className="absolute top-0 h-full bg-default/40" style={{ left: i * diaPx, width: diaPx }} />
                  ) : diaPx >= 20 ? (
                    <div key={i} className="absolute top-0 h-full border-l border-border/40" style={{ left: i * diaPx }} />
                  ) : null,
                )}
                <div className="absolute top-0 z-10 h-full w-0.5 bg-accent/70" style={{ left: xDe(hoy) + diaPx / 2 }} />
                {hoverCelda && !arrastre ? (
                  <div
                    className="absolute z-[5] flex items-center justify-center rounded border border-dashed border-accent bg-accent-soft/60 text-xs font-semibold text-accent"
                    style={{ left: hoverCelda.dia * diaPx, top: hoverCelda.y + 3, width: Math.max(diaPx, 14), height: hoverCelda.h - 6 }}
                    title={format(addDays(desde, hoverCelda.dia), "EEEE d 'de' MMMM", { locale: es })}
                  >
                    +
                  </div>
                ) : null}
              </div>

              {/* Filas */}
              {filas.map((f) =>
                f.tipo === "grupo" ? (
                  <div
                    key={f.key}
                    className="absolute left-0 flex w-full items-center border-b border-border bg-default/30"
                    style={{ top: HEADER_H + f.y, height: GROUP_H }}
                  >
                    {capaCrear(f.y, GROUP_H, f.contexto)}
                    <div
                      className="sticky left-0 z-20 flex h-full items-center gap-2 bg-surface px-3 text-xs font-semibold"
                      style={{ width: LEFT_W, minWidth: LEFT_W }}
                    >
                      {f.colorId ? (
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                          style={{ backgroundColor: colorForId(f.colorId) }}
                        >
                          {initialsFor(f.label)}
                        </span>
                      ) : null}
                      <span className="truncate">{f.label}</span>
                      <span className="ml-auto text-muted">{f.total}</span>
                    </div>
                  </div>
                ) : (
                  <FilaTarea
                    key={f.key}
                    item={f.item}
                    rango={rangoConArrastre(f.item, arrastre)}
                    arrastrando={arrastre?.id === f.item.tarea.id}
                    destacada={destacadaId === f.item.tarea.id}
                    conflictos={conflictosPorTarea.get(f.item.tarea.id) ?? null}
                    predecesoras={(f.item.tarea.bloqueadaPor ?? []).map((d) => d.titulo)}
                    sucesoras={(f.item.tarea.bloquea ?? []).map((d) => d.titulo)}
                    top={HEADER_H + f.y}
                    xDe={xDe}
                    diaPx={diaPx}
                    atenuada={atenuada(f.item.tarea.id)}
                    capa={capaCrear(f.y, ROW_H, f.contexto)}
                    onHover={(id) => !arrastre && setHoverId(id)}
                    onEditar={() => setEditTarea(f.item.tarea)}
                    onArrastre={(e, modo) => empezarArrastre(e, f.item.tarea.id, modo)}
                  />
                ),
              )}

              {/* Hueco final para crear tareas fuera de cualquier grupo */}
              <div className="absolute left-0 flex w-full" style={{ top: HEADER_H + altoFilas, height: HUECO_FINAL_H }}>
                {capaCrear(altoFilas, HUECO_FINAL_H, contextoFiltro)}
                <div
                  className="sticky left-0 z-20 flex h-full items-center border-r border-border bg-surface px-3 text-xs text-muted"
                  style={{ width: LEFT_W, minWidth: LEFT_W }}
                >
                  {planificadas.length === 0 ? "No hay tareas planificadas. " : ""}Haz clic en un día para crear una tarea.
                </div>
              </div>

              {/* Conectores entre tareas relacionadas */}
              <svg
                className="pointer-events-none absolute z-[15]"
                style={{ left: LEFT_W, top: HEADER_H, width: anchoTimeline, height: altoFilas }}
              >
                <defs>
                  <marker id="gantt-flecha" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,0 L8,4 L0,8 z" fill="context-stroke" />
                  </marker>
                  {/* Puntas de las dependencias: tamaño fijo y color explícito (normal / incumplida) */}
                  {[
                    { id: "gantt-dep", color: COLOR_DEPENDENCIA },
                    { id: "gantt-dep-ko", color: COLOR_DEPENDENCIA_INCUMPLIDA },
                  ].map((m) => (
                    <marker
                      key={m.id}
                      id={m.id}
                      viewBox="0 0 8 8"
                      refX="7"
                      refY="4"
                      markerWidth="8"
                      markerHeight="8"
                      markerUnits="userSpaceOnUse"
                      orient="auto"
                    >
                      <path d="M0,0 L8,4 L0,8 z" fill={m.color} />
                    </marker>
                  ))}
                </defs>
                {conectores.map(({ a, b }) => {
                  const pa = barras.get(a)!;
                  const pb = barras.get(b)!;
                  const resaltado = relacionadasConHover?.has(a) && relacionadasConHover?.has(b) && (hoverId === a || hoverId === b);
                  const x1 = pa.x2;
                  const x2 = pb.x1;
                  const dx = Math.max(24, Math.abs(x2 - x1) / 2);
                  const d = `M ${x1} ${pa.yc} C ${x1 + dx} ${pa.yc}, ${x2 - dx} ${pb.yc}, ${x2} ${pb.yc}`;
                  return (
                    <path
                      key={`${a}-${b}`}
                      d={d}
                      fill="none"
                      stroke={resaltado ? "var(--accent)" : "var(--muted)"}
                      strokeOpacity={relacionadasConHover && !resaltado ? 0.12 : resaltado ? 1 : 0.4}
                      strokeWidth={resaltado ? 2 : 1.2}
                      strokeDasharray={x2 < x1 ? "4 3" : undefined}
                      markerEnd="url(#gantt-flecha)"
                    />
                  );
                })}
                {/* Dependencias fin → inicio (en rojo si se incumplen) */}
                {flechasDep.map((d) => {
                  const ko = clavesIncumplidas.has(claveDep(d));
                  const enHover = hoverId === d.pred || hoverId === d.succ;
                  const opacidad = relacionadasConHover && !enHover ? 0.2 : ko || enHover ? 1 : 0.75;
                  return (
                    <path
                      key={claveDep(d)}
                      d={rutaDependencia(barras.get(d.pred)!, barras.get(d.succ)!)}
                      fill="none"
                      stroke={ko ? COLOR_DEPENDENCIA_INCUMPLIDA : COLOR_DEPENDENCIA}
                      strokeOpacity={opacidad}
                      strokeWidth={enHover ? 2.4 : 1.8}
                      strokeLinejoin="round"
                      markerEnd={`url(#${ko ? "gantt-dep-ko" : "gantt-dep"})`}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {sinFechas.length > 0 ? (
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="mb-2 text-sm font-semibold">
                Sin planificar <span className="font-normal text-muted">({sinFechas.length} sin fecha de inicio ni objetivo)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {sinFechas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditTarea(t)}
                    style={{ borderLeftColor: PRIORIDAD_GANTT_COLOR[t.prioridad] }}
                    className="max-w-xs truncate rounded-md border border-border border-l-4 px-2 py-1 text-left text-xs hover:bg-default/40"
                  >
                    <span className="text-muted">{t.proyectoCodigo}</span> {t.titulo}
                    {t.responsableNombre ? <span className="text-muted"> · {t.responsableNombre}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <TareaFormModal
        isOpen={editando || nuevaTarea !== null}
        onOpenChange={(open) => {
          if (open) return;
          setEditTarea(null);
          setNuevaTarea(null);
        }}
        tarea={editTarea}
        defaults={nuevaTarea ?? undefined}
        proyectos={editando ? proyectos : proyectosDelEquipo}
        personas={personas}
        onSaved={cargar}
      />
    </div>
  );
}

function FilaTarea({
  item,
  rango,
  arrastrando,
  destacada,
  conflictos,
  predecesoras,
  sucesoras,
  top,
  xDe,
  diaPx,
  atenuada,
  capa,
  onHover,
  onEditar,
  onArrastre,
}: {
  item: TareaPlanificada;
  rango: { inicio: Date; fin: Date };
  arrastrando: boolean;
  destacada: boolean;
  // Predecesoras que aún no han terminado cuando empieza esta tarea (null si no hay conflicto).
  conflictos: string[] | null;
  predecesoras: string[];
  sucesoras: string[];
  top: number;
  xDe: (d: Date) => number;
  diaPx: number;
  atenuada: boolean;
  capa: React.ReactNode;
  onHover: (id: string | null) => void;
  onEditar: () => void;
  onArrastre: (e: React.PointerEvent, modo: ModoArrastre) => void;
}) {
  const t = item.tarea;
  const color = colorEstado(t.estado);
  const cancelada = t.estado === "Cancelada";
  const x = xDe(rango.inicio);
  const w = (differenceInCalendarDays(rango.fin, rango.inicio) + 1) * diaPx;
  const textoRango = `${fechaCorta(rango.inicio)} → ${fechaCorta(rango.fin)}`;
  const textoConflicto = conflictos
    ? `⚠ Dependencia incumplida: empieza antes de que termine ${conflictos.join(", ")}`
    : null;
  const tooltip = [
    t.titulo,
    `${t.proyectoCodigo} · ${ESTADO_TAREA_LABEL[t.estado]} · Prioridad ${PRIORIDAD_LABEL[t.prioridad]}`,
    `${textoRango}${item.estimada ? " (duración estimada)" : ""}${t.estaVencida ? " · Vencida" : ""}`,
    t.responsableNombre ? `Responsable: ${t.responsableNombre}` : "Sin responsable",
    t.relacionadas.length ? `Relacionada con: ${t.relacionadas.map((r) => r.titulo).join(", ")}` : null,
    predecesoras.length ? `Depende de: ${predecesoras.join(", ")}` : null,
    sucesoras.length ? `Bloquea a: ${sucesoras.join(", ")}` : null,
    textoConflicto,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      className={`absolute left-0 flex w-full items-center border-b border-border/50 transition-opacity ${atenuada ? "opacity-30" : ""}`}
      style={{ top, height: ROW_H }}
      onMouseEnter={() => onHover(t.id)}
      onMouseLeave={() => onHover(null)}
    >
      {capa}
      <button
        type="button"
        onClick={onEditar}
        className="sticky left-0 z-20 flex h-full items-center gap-2 border-r border-border bg-surface px-3 text-left hover:bg-default/40"
        style={{ width: LEFT_W, minWidth: LEFT_W }}
        title={tooltip}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">{t.titulo}</span>
          <span className="block truncate text-[10px] text-muted">
            {t.proyectoCodigo}
            {t.responsableNombre ? ` · ${t.responsableNombre}` : ""}
            {t.relacionadas.length ? ` · 🔗 ${t.relacionadas.length}` : ""}
          </span>
        </span>
        {conflictos ? <MarcaConflicto className="shrink-0" title={textoConflicto ?? undefined} /> : null}
      </button>

      <div
        role="button"
        tabIndex={0}
        title={arrastrando ? undefined : tooltip}
        onPointerDown={(e) => onArrastre(e, "mover")}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onEditar()}
        className={`group absolute z-10 flex cursor-grab items-center gap-1 overflow-hidden rounded-md pl-2.5 pr-1.5 text-[10px] font-medium text-white shadow-sm hover:brightness-110 ${
          t.estaVencida ? HALO_VENCIDA : ""
        } ${arrastrando ? "shadow-lg ring-2 ring-accent" : ""} ${destacada ? "animate-pulse ring-2 ring-danger ring-offset-2" : ""}`}
        style={{
          left: LEFT_W + x + 1,
          width: Math.max(w - 2, 6),
          height: BAR_H,
          backgroundColor: color,
          opacity: cancelada ? OPACIDAD_CANCELADA : 1,
          backgroundImage: item.estimada ? rayasEstimada(6) : undefined,
        }}
      >
        <FranjaPrioridad prioridad={t.prioridad} />
        {/* Asas laterales para cambiar la fecha de inicio (izquierda) o la fecha objetivo (derecha) */}
        <span
          aria-label="Cambiar fecha de inicio"
          className="absolute inset-y-0 left-0 cursor-ew-resize bg-white/0 group-hover:bg-white/30"
          style={{ width: HANDLE_W }}
          onPointerDown={(e) => onArrastre(e, "inicio")}
        />
        <span
          aria-label="Cambiar fecha objetivo"
          className="absolute inset-y-0 right-0 cursor-ew-resize bg-white/0 group-hover:bg-white/30"
          style={{ width: HANDLE_W }}
          onPointerDown={(e) => onArrastre(e, "fin")}
        />
        {t.responsableId ? (
          <span
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[7px] font-semibold text-white ring-1 ring-white/70"
            style={{ backgroundColor: colorForId(t.responsableId) }}
          >
            {initialsFor(t.responsableNombre ?? "")}
          </span>
        ) : null}
        <span className={`truncate ${cancelada ? "line-through" : ""}`}>
          {t.estado === "Hecha" ? "✓ " : ""}
          {t.titulo}
        </span>
      </div>

      {conflictos ? (
        <MarcaConflicto
          className="absolute z-20 cursor-help"
          title={textoConflicto ?? undefined}
          // Sobre la esquina superior izquierda de la barra, sin tapar la punta de la flecha que llega a su inicio.
          style={{ left: LEFT_W + x + 3, top: (ROW_H - BAR_H) / 2 - 7 }}
        />
      ) : null}

      {arrastrando ? (
        <span
          className="pointer-events-none absolute z-30 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background shadow"
          style={{ left: LEFT_W + x, top: -14 }}
        >
          {textoRango}
        </span>
      ) : null}
    </div>
  );
}
