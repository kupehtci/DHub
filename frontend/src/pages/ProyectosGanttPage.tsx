import { Button, Checkbox, Spinner } from "@heroui/react";
import { addDays, differenceInCalendarDays, format, isWeekend, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GanttLegend, LegendColor } from "../components/GanttLegend";
import { colorForId, initialsFor } from "../components/PersonaAvatar";
import { SelectField } from "../components/SelectField";
import { equiposApi, proyectosApi } from "../lib/api";
import {
  CHART_COLORS,
  CHIP_COLOR_TO_CHART,
  ESTADO_PROYECTO_COLOR,
  ESTADO_PROYECTO_LABEL,
  PRIORIDAD_CHART_COLOR,
  PRIORIDAD_LABEL,
} from "../lib/format";
import type { Equipo, EstadoProyecto, Proyecto } from "../types";

type Agrupacion = "equipo" | "responsable" | "ninguna";
type Escala = "dia" | "semana" | "mes";
type ModoArrastre = "inicio" | "fin" | "mover";

// Los proyectos duran meses: escalas más compactas que en el Gantt de tareas.
const DIA_PX: Record<Escala, number> = { dia: 40, semana: 14, mes: 5 };
const ESCALA_LABEL: Record<Escala, string> = { dia: "Días", semana: "Semanas", mes: "Meses" };
const ESTADOS_PROYECTO = Object.keys(ESTADO_PROYECTO_LABEL) as EstadoProyecto[];

const LEFT_W = 300;
const ROW_H = 36;
const GROUP_H = 30;
const HEADER_H = 52;
const BAR_H = 20;
const HANDLE_W = 7;
// Duración mínima con la que se pinta un proyecto sin fecha de fin.
const DIAS_SIN_FIN = 30;

interface ProyectoPlanificado {
  proyecto: Proyecto;
  inicio: Date;
  fin: Date;
  // true si el proyecto no tiene fecha de fin y el final de la barra es orientativo.
  abierto: boolean;
}

type Fila =
  | { tipo: "grupo"; key: string; label: string; colorId: string | null; total: number; y: number }
  | { tipo: "proyecto"; key: string; item: ProyectoPlanificado; y: number };

interface Arrastre {
  id: string;
  modo: ModoArrastre;
  startX: number;
  delta: number;
  movido: boolean;
}

const aIso = (d: Date) => format(d, "yyyy-MM-dd");
const estaCerrado = (p: Proyecto) => p.estado === "Cerrado" || p.estado === "Cancelado";

function planificar(p: Proyecto, hoy: Date): ProyectoPlanificado {
  const ini = startOfDay(parseISO(p.fechaInicio));
  if (p.fechaFin) {
    const fin = startOfDay(parseISO(p.fechaFin));
    return fin < ini ? { proyecto: p, inicio: fin, fin: ini, abierto: false } : { proyecto: p, inicio: ini, fin, abierto: false };
  }
  // Sin fecha de fin: hasta hoy o, como mínimo, DIAS_SIN_FIN días desde el inicio.
  const minimo = addDays(ini, DIAS_SIN_FIN - 1);
  return { proyecto: p, inicio: ini, fin: hoy > minimo ? hoy : minimo, abierto: true };
}

// Aplica el desplazamiento (en días) de un arrastre en curso al rango de un proyecto.
function rangoConArrastre(item: ProyectoPlanificado, arrastre: Arrastre | null): { inicio: Date; fin: Date } {
  if (!arrastre || arrastre.id !== item.proyecto.id || arrastre.delta === 0) return item;
  const { inicio, fin } = item;
  if (arrastre.modo === "mover") return { inicio: addDays(inicio, arrastre.delta), fin: addDays(fin, arrastre.delta) };
  if (arrastre.modo === "inicio") {
    const nuevo = addDays(inicio, arrastre.delta);
    return { inicio: nuevo > fin ? fin : nuevo, fin };
  }
  const nuevo = addDays(fin, arrastre.delta);
  return { inicio, fin: nuevo < inicio ? inicio : nuevo };
}

const colorChart = (estado: EstadoProyecto) => CHIP_COLOR_TO_CHART[ESTADO_PROYECTO_COLOR[estado]] ?? CHART_COLORS.muted;
// El gris "muted" es demasiado claro para una barra con texto blanco.
const colorBarra = (estado: EstadoProyecto) => {
  const c = colorChart(estado);
  return c === CHART_COLORS.muted ? "var(--default-foreground)" : c;
};

export default function ProyectosGanttPage() {
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [equipoId, setEquipoId] = useState<string | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("equipo");
  const [escala, setEscala] = useState<Escala>("semana");
  const [ocultarCerrados, setOcultarCerrados] = useState(true);

  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const arrastreRef = useRef<Arrastre | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const centradoInicial = useRef(false);

  const cargar = () => {
    setLoading((prev) => prev || proyectos.length === 0);
    proyectosApi
      .listar()
      .then((r) => setProyectos(r.data))
      .catch(() => setError("No se han podido cargar los proyectos."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    equiposApi.listar().then((r) => setEquipos(r.data));
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoy = startOfDay(new Date());
  const hoyKey = aIso(hoy);

  const planificados = useMemo(() => {
    let lista = proyectos;
    if (equipoId) lista = lista.filter((p) => p.equipoId === equipoId);
    if (estado) lista = lista.filter((p) => p.estado === estado);
    // Si se filtra explícitamente por un estado cerrado, se muestra aunque esté marcada la casilla.
    else if (ocultarCerrados) lista = lista.filter((p) => !estaCerrado(p));
    const hoyDate = parseISO(hoyKey);
    return lista
      .map((p) => planificar(p, hoyDate))
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime() || a.fin.getTime() - b.fin.getTime());
  }, [proyectos, equipoId, estado, ocultarCerrados, hoyKey]);

  // Rango visible: desde la primera fecha hasta la última, con margen, incluyendo siempre hoy.
  const { desde, numDias } = useMemo(() => {
    const base = parseISO(hoyKey);
    let min = addDays(base, -14);
    let max = addDays(base, 60);
    planificados.forEach((p) => {
      if (p.inicio < min) min = p.inicio;
      if (p.fin > max) max = p.fin;
    });
    const desde = addDays(min, -14);
    return { desde, numDias: differenceInCalendarDays(addDays(max, 30), desde) + 1 };
  }, [planificados, hoyKey]);

  const diaPx = DIA_PX[escala];
  const anchoTimeline = numDias * diaPx;
  const xDe = (d: Date) => differenceInCalendarDays(d, desde) * diaPx;

  const filas = useMemo<Fila[]>(() => {
    const resultado: Fila[] = [];
    let y = 0;
    const pushProyectos = (items: ProyectoPlanificado[]) =>
      items.forEach((item) => {
        resultado.push({ tipo: "proyecto", key: item.proyecto.id, item, y });
        y += ROW_H;
      });

    if (agrupacion === "ninguna") {
      pushProyectos(planificados);
      return resultado;
    }

    const grupos = new Map<string, { label: string; colorId: string | null; items: ProyectoPlanificado[] }>();
    planificados.forEach((item) => {
      const p = item.proyecto;
      const key = (agrupacion === "equipo" ? p.equipoId : p.responsableId) ?? "__sin__";
      const label =
        agrupacion === "equipo" ? (p.equipoNombre ?? "Sin equipo") : (p.responsableNombre ?? "Sin responsable");
      if (!grupos.has(key)) grupos.set(key, { label, colorId: agrupacion === "responsable" ? p.responsableId : null, items: [] });
      grupos.get(key)!.items.push(item);
    });

    [...grupos.entries()]
      .sort(([ka, a], [kb, b]) => (ka === "__sin__" ? 1 : kb === "__sin__" ? -1 : a.label.localeCompare(b.label)))
      .forEach(([key, g]) => {
        resultado.push({ tipo: "grupo", key: `g-${key}`, label: g.label, colorId: g.colorId, total: g.items.length, y });
        y += GROUP_H;
        pushProyectos(g.items);
      });
    return resultado;
  }, [planificados, agrupacion]);

  const altoFilas = Math.max(
    filas.reduce((acc, f) => acc + (f.tipo === "grupo" ? GROUP_H : ROW_H), 0),
    ROW_H * 2,
  );

  const dias = useMemo(() => Array.from({ length: numDias }, (_, i) => addDays(desde, i)), [desde, numDias]);
  const meses = useMemo(() => {
    const lista: { label: string; x: number; w: number }[] = [];
    dias.forEach((d, i) => {
      const label = format(d, diaPx >= 14 ? "MMMM yyyy" : "MMM yy", { locale: es });
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
  // cada recarga, para no perder la posición del usuario.
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
      const item = planificados.find((p) => p.proyecto.id === a.id);
      if (!item) return;

      // Un clic sin desplazamiento sobre la barra abre el proyecto; un arrastre nunca navega.
      if (!a.movido) {
        if (a.modo === "mover") navigate(`/proyectos/${a.id}`);
        return;
      }
      if (a.delta === 0) return;

      const { inicio, fin } = rangoConArrastre(item, a);
      const p = item.proyecto;
      const fechaInicio = aIso(inicio);
      // Un proyecto sin fecha de fin la sigue sin tener salvo que se arrastre su extremo derecho.
      const fechaFin = item.abierto && a.modo !== "fin" ? null : aIso(fin);

      // Actualización optimista: se pinta ya y, si falla, se recarga desde el servidor.
      setProyectos((prev) => prev.map((x) => (x.id === p.id ? { ...x, fechaInicio, fechaFin } : x)));
      setError(null);
      // El PUT espera el DTO completo de actualización: se reenvían el resto de campos tal cual.
      proyectosApi
        .actualizar(p.id, {
          nombre: p.nombre,
          codigo: p.codigo,
          sistemaInformacion: p.sistemaInformacion,
          clienteArea: p.clienteArea,
          responsableId: p.responsableId,
          equipoId: p.equipoId,
          estado: p.estado,
          fechaInicio,
          fechaFin,
          prioridad: p.prioridad,
          jiraClaveProyecto: p.jiraClaveProyecto,
          jiraProyectoUrl: p.jiraProyectoUrl,
        })
        .catch(() => {
          setError(`No se han podido guardar las nuevas fechas de ${p.codigo}.`);
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
  }, [arrastrando, diaPx, planificados]);

  const totalCerrados = proyectos.filter(
    (p) => estaCerrado(p) && (!equipoId || p.equipoId === equipoId),
  ).length;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gantt de proyectos</h1>
          <p className="text-sm text-muted">
            Arrastra los bordes de una barra para cambiar las fechas de inicio o fin, o la barra entera para moverla. Haz clic en un
            proyecto para abrir su ficha.
          </p>
        </div>
        <GanttLegend
          groups={[
            {
              key: "estados",
              items: [
                ...ESTADOS_PROYECTO.map((e) => ({
                  key: e,
                  label: ESTADO_PROYECTO_LABEL[e],
                  swatch: <LegendColor color={colorBarra(e)} />,
                })),
                {
                  key: "sin-fin",
                  label: "Sin fecha fin",
                  swatch: <span className="h-2.5 w-4 rounded-sm border border-dashed border-foreground/60" />,
                },
              ],
            },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <SelectField
            label="Equipo"
            emptyOption="Todos los equipos"
            options={equipos.map((e) => ({ id: e.id, label: e.nombre }))}
            value={equipoId}
            onChange={setEquipoId}
          />
        </div>
        <div className="w-44">
          <SelectField
            label="Estado"
            emptyOption="Todos los estados"
            options={ESTADOS_PROYECTO.map((e) => ({ id: e, label: ESTADO_PROYECTO_LABEL[e] }))}
            value={estado}
            onChange={setEstado}
          />
        </div>
        <div className="w-44">
          <SelectField
            label="Agrupar por"
            options={[
              { id: "equipo", label: "Equipo" },
              { id: "responsable", label: "Responsable" },
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
        <Checkbox isSelected={ocultarCerrados} onChange={setOcultarCerrados} isDisabled={estado !== null}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Ocultar cerrados y cancelados{totalCerrados ? ` (${totalCerrados})` : ""}
          </Checkbox.Content>
        </Checkbox>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div
          ref={scrollRef}
          className={`min-h-0 flex-1 select-none overflow-auto rounded-xl border border-border bg-surface ${
            arrastre ? (arrastre.modo === "mover" ? "cursor-grabbing" : "cursor-ew-resize") : ""
          }`}
        >
          <div className="relative" style={{ width: LEFT_W + anchoTimeline, height: HEADER_H + altoFilas }}>
            {/* Cabecera: meses y días */}
            <div className="sticky top-0 z-30 flex border-b border-border bg-surface" style={{ height: HEADER_H }}>
              <div
                className="sticky left-0 z-40 flex items-end border-r border-border bg-surface px-3 pb-2 text-xs font-semibold text-muted"
                style={{ width: LEFT_W, minWidth: LEFT_W }}
              >
                Proyecto
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
                  // Con días muy estrechos solo se rotula el lunes de cada semana (o el día 1 en la escala de meses).
                  const mostrar = diaPx >= 20 || (diaPx >= 10 ? d.getDay() === 1 : d.getDate() === 1 || d.getDate() === 15);
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

            {/* Fondo: fines de semana (o inicio de mes en escalas compactas) y línea de hoy */}
            <div className="pointer-events-none absolute" style={{ left: LEFT_W, top: HEADER_H, width: anchoTimeline, height: altoFilas }}>
              {diaPx >= 10
                ? dias.map((d, i) =>
                    isWeekend(d) ? (
                      <div key={i} className="absolute top-0 h-full bg-default/40" style={{ left: i * diaPx, width: diaPx }} />
                    ) : diaPx >= 20 ? (
                      <div key={i} className="absolute top-0 h-full border-l border-border/40" style={{ left: i * diaPx }} />
                    ) : null,
                  )
                : meses.map((m) => <div key={m.label + m.x} className="absolute top-0 h-full border-l border-border/60" style={{ left: m.x }} />)}
              <div className="absolute top-0 z-10 h-full w-0.5 bg-accent/70" style={{ left: xDe(hoy) + diaPx / 2 }} />
            </div>

            {/* Filas */}
            {filas.length === 0 ? (
              <div
                className="absolute left-0 flex items-center px-3 text-xs text-muted"
                style={{ top: HEADER_H, width: LEFT_W, height: ROW_H * 2 }}
              >
                No hay proyectos con los filtros seleccionados.
              </div>
            ) : null}
            {filas.map((f) =>
              f.tipo === "grupo" ? (
                <div
                  key={f.key}
                  className="absolute left-0 flex w-full items-center border-b border-border bg-default/30"
                  style={{ top: HEADER_H + f.y, height: GROUP_H }}
                >
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
                <FilaProyecto
                  key={f.key}
                  item={f.item}
                  rango={rangoConArrastre(f.item, arrastre)}
                  arrastrando={arrastre?.id === f.item.proyecto.id}
                  fijandoFin={arrastre?.id === f.item.proyecto.id && arrastre.modo === "fin" && arrastre.delta !== 0}
                  hoy={hoy}
                  top={HEADER_H + f.y}
                  xDe={xDe}
                  diaPx={diaPx}
                  onAbrir={() => navigate(`/proyectos/${f.item.proyecto.id}`)}
                  onArrastre={(e, modo) => empezarArrastre(e, f.item.proyecto.id, modo)}
                />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilaProyecto({
  item,
  rango,
  arrastrando,
  fijandoFin,
  hoy,
  top,
  xDe,
  diaPx,
  onAbrir,
  onArrastre,
}: {
  item: ProyectoPlanificado;
  rango: { inicio: Date; fin: Date };
  arrastrando: boolean;
  fijandoFin: boolean;
  hoy: Date;
  top: number;
  xDe: (d: Date) => number;
  diaPx: number;
  onAbrir: () => void;
  onArrastre: (e: React.PointerEvent, modo: ModoArrastre) => void;
}) {
  const p = item.proyecto;
  const color = colorBarra(p.estado);
  const x = xDe(rango.inicio);
  const w = (differenceInCalendarDays(rango.fin, rango.inicio) + 1) * diaPx;
  // Mientras se arrastra el extremo derecho de un proyecto abierto, se está fijando su fecha de fin.
  const abierto = item.abierto && !fijandoFin;
  const vencido = !item.abierto && !estaCerrado(p) && item.fin < hoy;
  const textoFin = abierto ? "sin fecha fin" : format(rango.fin, "d MMM yyyy", { locale: es });
  const textoRango = `${format(rango.inicio, "d MMM yyyy", { locale: es })} → ${textoFin}`;
  const tooltip = [
    `${p.codigo} · ${p.nombre}`,
    `${ESTADO_PROYECTO_LABEL[p.estado]} · Prioridad ${PRIORIDAD_LABEL[p.prioridad]}`,
    textoRango + (vencido ? " (fecha fin superada)" : ""),
    p.equipoNombre ? `Equipo: ${p.equipoNombre}` : "Sin equipo",
    p.responsableNombre ? `Responsable: ${p.responsableNombre}` : "Sin responsable",
    `Tareas: ${p.tareasTotal}${p.tareasVencidas ? ` · ${p.tareasVencidas} vencidas` : ""}${
      p.tareasBloqueadas ? ` · ${p.tareasBloqueadas} bloqueadas` : ""
    }`,
    p.riesgosAltos ? `Riesgos altos: ${p.riesgosAltos}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="absolute left-0 flex w-full items-center border-b border-border/50" style={{ top, height: ROW_H }}>
      <button
        type="button"
        onClick={onAbrir}
        className="sticky left-0 z-20 flex h-full items-center gap-2 border-r border-border bg-surface px-3 text-left hover:bg-default/40"
        style={{ width: LEFT_W, minWidth: LEFT_W }}
        title={tooltip}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">{p.nombre}</span>
          <span className="block truncate text-[10px] text-muted">
            {p.codigo} · {ESTADO_PROYECTO_LABEL[p.estado]}
            {p.responsableNombre ? ` · ${p.responsableNombre}` : ""}
            {item.abierto ? " · sin fecha fin" : ""}
          </span>
        </span>
        {p.tareasVencidas || p.riesgosAltos ? (
          <span className="shrink-0 text-[10px] font-semibold text-danger" title="Tareas vencidas / riesgos altos">
            {p.tareasVencidas ? `${p.tareasVencidas}⏱` : ""}
            {p.tareasVencidas && p.riesgosAltos ? " " : ""}
            {p.riesgosAltos ? `${p.riesgosAltos}⚠` : ""}
          </span>
        ) : null}
      </button>

      <div
        role="button"
        tabIndex={0}
        title={arrastrando ? undefined : tooltip}
        onPointerDown={(e) => onArrastre(e, "mover")}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onAbrir()}
        className={`group absolute z-10 flex cursor-grab items-center gap-1 overflow-hidden rounded-md px-1.5 text-[10px] font-medium shadow-sm hover:brightness-110 ${
          abierto ? "text-foreground" : "text-white"
        } ${vencido ? "ring-2 ring-danger" : ""} ${arrastrando ? "shadow-lg ring-2 ring-accent" : ""}`}
        style={{
          left: LEFT_W + x + 1,
          width: Math.max(w - 2, 6),
          height: BAR_H,
          opacity: estaCerrado(p) ? 0.6 : 1,
          borderLeft: `4px solid ${PRIORIDAD_CHART_COLOR[p.prioridad]}`,
          ...(abierto
            ? {
                // Sin fecha de fin: barra translúcida, borde discontinuo y desvanecida hacia la derecha.
                backgroundColor: "transparent",
                backgroundImage: `linear-gradient(to right, color-mix(in srgb, ${color} 55%, transparent), color-mix(in srgb, ${color} 10%, transparent))`,
                borderTop: `1.5px dashed ${color}`,
                borderBottom: `1.5px dashed ${color}`,
                borderRight: `1.5px dashed ${color}`,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
              }
            : { backgroundColor: color }),
        }}
      >
        {/* Asas laterales para cambiar la fecha de inicio (izquierda) o la fecha de fin (derecha) */}
        <span
          aria-label="Cambiar fecha de inicio"
          className="absolute inset-y-0 left-0 cursor-ew-resize bg-white/0 group-hover:bg-white/30"
          style={{ width: HANDLE_W }}
          onPointerDown={(e) => onArrastre(e, "inicio")}
        />
        <span
          aria-label={item.abierto ? "Fijar fecha de fin" : "Cambiar fecha de fin"}
          className="absolute inset-y-0 right-0 cursor-ew-resize bg-white/0 group-hover:bg-white/30"
          style={{ width: HANDLE_W }}
          onPointerDown={(e) => onArrastre(e, "fin")}
        />
        {p.responsableId ? (
          <span
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[7px] font-semibold text-white"
            style={{ backgroundColor: colorForId(p.responsableId) }}
          >
            {initialsFor(p.responsableNombre ?? "")}
          </span>
        ) : null}
        <span className="truncate">
          {p.codigo} · {p.nombre}
        </span>
        {abierto ? <span className="ml-auto shrink-0 pr-1 italic opacity-80">sin fecha fin →</span> : null}
      </div>

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
