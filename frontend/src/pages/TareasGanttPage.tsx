import { Button, Checkbox, Spinner } from "@heroui/react";
import { addDays, differenceInCalendarDays, format, isWeekend, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import { colorForId, initialsFor } from "../components/PersonaAvatar";
import { SelectField } from "../components/SelectField";
import { TareaFormModal, type TareaDefaults } from "../components/TareaFormModal";
import { equiposApi, personasApi, proyectosApi, tareasApi } from "../lib/api";
import {
  CHART_COLORS,
  CHIP_COLOR_TO_CHART,
  ESTADO_TAREA_COLOR,
  ESTADO_TAREA_LABEL,
  PRIORIDAD_CHART_COLOR,
  PRIORIDAD_LABEL,
} from "../lib/format";
import type { Equipo, Persona, Proyecto, Tarea } from "../types";

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

function planificar(t: Tarea): TareaPlanificada | null {
  const ini = t.fechaInicio ? startOfDay(parseISO(t.fechaInicio)) : null;
  const fin = t.fechaObjetivo ? startOfDay(parseISO(t.fechaObjetivo)) : null;
  if (ini && fin) return fin < ini ? { tarea: t, inicio: fin, fin: ini, estimada: false } : { tarea: t, inicio: ini, fin, estimada: false };
  const dias = diasDeEstimacion(t.estimacionHoras);
  if (ini) return { tarea: t, inicio: ini, fin: addDays(ini, dias - 1), estimada: true };
  if (fin) return { tarea: t, inicio: addDays(fin, -(dias - 1)), fin, estimada: true };
  return null;
}

// Aplica el desplazamiento (en días) de un arrastre en curso al rango de una tarea.
function rangoConArrastre(item: TareaPlanificada, arrastre: Arrastre | null): { inicio: Date; fin: Date } {
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

const colorEstado = (t: Tarea) => CHIP_COLOR_TO_CHART[ESTADO_TAREA_COLOR[t.estado]] ?? CHART_COLORS.muted;

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
    if (soloConRelacion) lista = lista.filter((t) => t.relacionadas.length > 0);
    return lista;
  }, [tareas, ocultarCerradas, soloConRelacion]);

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
        if (vistos.has(clave)) return;
        vistos.add(clave);
        const [a, b] = barras.get(t.id)!.x1 <= barras.get(r.id)!.x1 ? [t.id, r.id] : [r.id, t.id];
        lista.push({ a, b });
      }),
    );
    return lista;
  }, [visibles, barras]);

  const relacionadasConHover = useMemo(() => {
    if (!hoverId) return null;
    const t = tareas.find((x) => x.id === hoverId);
    return new Set([hoverId, ...(t?.relacionadas.map((r) => r.id) ?? [])]);
  }, [hoverId, tareas]);

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
  }, [arrastrando, diaPx, planificadas]);

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
            una tarea ese día. Las líneas unen tareas relacionadas.
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
            Solo tareas con relación
          </Checkbox.Content>
        </Checkbox>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

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
                      strokeOpacity={relacionadasConHover && !resaltado ? 0.15 : resaltado ? 1 : 0.55}
                      strokeWidth={resaltado ? 2.2 : 1.4}
                      strokeDasharray={x2 < x1 ? "4 3" : undefined}
                      markerEnd="url(#gantt-flecha)"
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
                    style={{ borderLeftColor: PRIORIDAD_CHART_COLOR[t.prioridad] }}
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
  const color = colorEstado(t);
  const x = xDe(rango.inicio);
  const w = (differenceInCalendarDays(rango.fin, rango.inicio) + 1) * diaPx;
  const textoRango = `${format(rango.inicio, "d MMM", { locale: es })} → ${format(rango.fin, "d MMM", { locale: es })}`;
  const tooltip = [
    t.titulo,
    `${t.proyectoCodigo} · ${ESTADO_TAREA_LABEL[t.estado]} · Prioridad ${PRIORIDAD_LABEL[t.prioridad]}`,
    `${textoRango}${item.estimada ? " (duración estimada)" : ""}`,
    t.responsableNombre ? `Responsable: ${t.responsableNombre}` : "Sin responsable",
    t.relacionadas.length ? `Relacionada con: ${t.relacionadas.map((r) => r.titulo).join(", ")}` : null,
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
      </button>

      <div
        role="button"
        tabIndex={0}
        title={arrastrando ? undefined : tooltip}
        onPointerDown={(e) => onArrastre(e, "mover")}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onEditar()}
        className={`group absolute z-10 flex cursor-grab items-center gap-1 overflow-hidden rounded-md px-1.5 text-[10px] font-medium text-white shadow-sm hover:brightness-110 ${
          t.estaVencida ? "ring-2 ring-danger" : ""
        } ${arrastrando ? "shadow-lg ring-2 ring-accent" : ""}`}
        style={{
          left: LEFT_W + x + 1,
          width: Math.max(w - 2, 6),
          height: BAR_H,
          backgroundColor: color === CHART_COLORS.muted ? "var(--default-foreground)" : color,
          opacity: t.estado === "Hecha" || t.estado === "Cancelada" ? 0.6 : 1,
          borderLeft: `4px solid ${PRIORIDAD_CHART_COLOR[t.prioridad]}`,
          backgroundImage: item.estimada
            ? "repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.25) 6px 12px)"
            : undefined,
        }}
      >
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
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[7px] font-semibold"
            style={{ backgroundColor: colorForId(t.responsableId) }}
          >
            {initialsFor(t.responsableNombre ?? "")}
          </span>
        ) : null}
        <span className="truncate">{t.titulo}</span>
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
