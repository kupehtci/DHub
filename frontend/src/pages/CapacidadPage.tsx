import { Button, Checkbox, Input, Label, Spinner, TextField } from "@heroui/react";
import { addDays, addWeeks, format, getISOWeek, isSameDay, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FormModal } from "../components/FormModal";
import { IconChevronLeft, IconChevronRight, IconUmbrella, IconWarning } from "../components/Icons";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { SearchableSelect } from "../components/SearchableSelect";
import { SegmentedControl } from "../components/SegmentedControl";
import { TareaFormModal, type ProyectoOption } from "../components/TareaFormModal";
import { capacidadApi, equiposApi, personasApi, proyectosApi, tareasApi } from "../lib/api";
import { formatHoras } from "../lib/format";
import { normalizar } from "../lib/search";
import type { Capacidad, CapacidadPersona, CapacidadSemana, CapacidadTarea, Equipo, Persona, Tarea } from "../types";

type NumSemanas = "4" | "8" | "12" | "26";
type Orden = "nombre" | "libres" | "cargadas";

const OPCIONES_SEMANAS: { id: NumSemanas; label: string }[] = [
  { id: "4", label: "4 sem" },
  { id: "8", label: "8 sem" },
  { id: "12", label: "12 sem" },
  { id: "26", label: "26 sem" },
];

const OPCIONES_ORDEN: { id: Orden; label: string }[] = [
  { id: "nombre", label: "Nombre" },
  { id: "libres", label: "Más libres" },
  { id: "cargadas", label: "Más cargadas" },
];

// Ocupación media por debajo de la cual una persona "tiene hueco".
const UMBRAL_HUECO = 80;

const lunesDe = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
const claveDia = (d: Date) => format(d, "yyyy-MM-dd");

// Nivel de ocupación de una celda: decide color, etiqueta y la leyenda.
type Nivel = "libre" | "normal" | "alto" | "sobrecarga" | "ausente" | "sinCapacidad";

const NIVEL_ESTILO: Record<Nivel, { celda: string; label: string; muestra: string }> = {
  libre: { celda: "bg-success-soft/60 text-success-soft-foreground hover:bg-success-soft", label: "Libre (< 60 %)", muestra: "bg-success-soft ring-1 ring-success/40" },
  normal: { celda: "bg-surface text-foreground hover:bg-surface-secondary", label: "Normal (60–90 %)", muestra: "bg-surface ring-1 ring-border" },
  alto: { celda: "bg-warning-soft text-warning-soft-foreground hover:bg-warning-soft-hover", label: "Al límite (90–110 %)", muestra: "bg-warning-soft ring-1 ring-warning/40" },
  sobrecarga: { celda: "bg-danger-soft text-danger-soft-foreground hover:bg-danger-soft/70", label: "Sobrecarga (> 110 %)", muestra: "bg-danger-soft ring-1 ring-danger/40" },
  ausente: { celda: "bg-surface-secondary text-muted hover:bg-default/40", label: "Ausente toda la semana", muestra: "bg-surface-secondary ring-1 ring-border" },
  sinCapacidad: { celda: "bg-surface-secondary text-muted hover:bg-default/40", label: "", muestra: "" },
};

function ocupacion(carga: number, capacidad: number): number | null {
  return capacidad > 0 ? (carga / capacidad) * 100 : null;
}

function nivelDe(s: Pick<CapacidadSemana, "cargaHoras" | "capacidadHoras" | "diasAusencia">): Nivel {
  if (s.capacidadHoras <= 0) {
    if (s.cargaHoras > 0) return "sobrecarga";
    return s.diasAusencia > 0 ? "ausente" : "sinCapacidad";
  }
  const pct = (s.cargaHoras / s.capacidadHoras) * 100;
  if (pct < 60) return "libre";
  if (pct < 90) return "normal";
  if (pct <= 110) return "alto";
  return "sobrecarga";
}

function formatPct(pct: number | null): string {
  return pct === null ? "—" : `${Math.round(pct)} %`;
}

// Número sin la "h" de formatHoras, para "carga / capacidad h".
function num(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

// Ocupación media de la persona en el rango visible (solo semanas con capacidad).
function ocupacionMedia(p: CapacidadPersona): number | null {
  const conCapacidad = p.semanas.filter((s) => s.capacidadHoras > 0);
  const capacidad = conCapacidad.reduce((a, s) => a + s.capacidadHoras, 0);
  const carga = conCapacidad.reduce((a, s) => a + s.cargaHoras, 0);
  return ocupacion(carga, capacidad);
}

type Detalle =
  | { tipo: "semana"; persona: CapacidadPersona; semana: CapacidadSemana }
  | { tipo: "atrasado"; persona: CapacidadPersona }
  | { tipo: "sinFechas"; persona: CapacidadPersona };

export default function CapacidadPage() {
  const [desde, setDesde] = useState(() => lunesDe(new Date()));
  const [numSemanas, setNumSemanas] = useState<NumSemanas>("8");
  const [equipoId, setEquipoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("nombre");
  const [soloConHueco, setSoloConHueco] = useState(false);

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  // Resultado de la última petición, etiquetado con la clave de filtros que lo produjo:
  // mientras la clave actual no coincide, la matriz está cargando.
  const [resultado, setResultado] = useState<{ clave: string; datos: Capacidad | null; error: string | null }>({ clave: "", datos: null, error: null });
  const [recarga, setRecarga] = useState(0);

  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [tareaModal, setTareaModal] = useState<{ open: boolean; tarea: Tarea | null }>({ open: false, tarea: null });
  const [abriendoTarea, setAbriendoTarea] = useState<string | null>(null);

  const [lunesActual] = useState(() => lunesDe(new Date()));

  // Catálogos: equipos para el filtro, proyectos y personas para el formulario de tarea.
  useEffect(() => {
    Promise.all([equiposApi.listar(), proyectosApi.listar(), personasApi.listar()]).then(([eq, pr, pe]) => {
      setEquipos(eq.data);
      setProyectos(pr.data);
      setPersonas(pe.data);
    });
  }, []);

  const clave = `${claveDia(desde)}|${numSemanas}|${equipoId ?? ""}|${recarga}`;

  useEffect(() => {
    let cancelado = false;
    capacidadApi
      // "hoy" es la fecha local del navegador: decide qué tareas están vencidas y desde cuándo se reparte la carga.
      .obtener({ desde: claveDia(desde), semanas: Number(numSemanas), equipoId: equipoId ?? undefined, hoy: claveDia(new Date()) })
      .then((r) => {
        if (!cancelado) setResultado({ clave, datos: r.data, error: null });
      })
      .catch(() => {
        if (!cancelado) setResultado((prev) => ({ clave, datos: prev.datos, error: "No se ha podido cargar la capacidad." }));
      });
    return () => {
      cancelado = true;
    };
  }, [clave, desde, numSemanas, equipoId]);

  const loading = resultado.clave !== clave;
  const datos = resultado.datos;
  const error = loading ? null : resultado.error;

  const recargar = () => setRecarga((n) => n + 1);

  const semanas = useMemo(() => (datos?.personas[0]?.semanas ?? []).map((s) => parseISO(s.lunes)), [datos]);

  const filas = useMemo(() => {
    if (!datos) return [];
    const terminos = normalizar(busqueda).split(/\s+/).filter(Boolean);
    const lista = datos.personas
      .map((p) => ({ persona: p, media: ocupacionMedia(p) }))
      .filter(({ persona }) => {
        if (terminos.length === 0) return true;
        const texto = normalizar(`${persona.nombre} ${persona.equipos.map((e) => e.nombre).join(" ")}`);
        return terminos.every((t) => texto.includes(t));
      })
      .filter(({ media }) => !soloConHueco || (media !== null && media < UMBRAL_HUECO));
    const porNombre = (a: CapacidadPersona, b: CapacidadPersona) => a.nombre.localeCompare(b.nombre, "es");
    if (orden === "nombre") return lista.sort((a, b) => porNombre(a.persona, b.persona));
    // Las personas sin capacidad en el rango (media null) van siempre al final.
    return lista.sort((a, b) => {
      if (a.media === null || b.media === null) return a.media === b.media ? porNombre(a.persona, b.persona) : a.media === null ? 1 : -1;
      return orden === "libres" ? a.media - b.media : b.media - a.media;
    });
  }, [datos, busqueda, orden, soloConHueco]);

  // Totales por semana de las personas visibles.
  const totales = useMemo(
    () =>
      semanas.map((_, i) => {
        const capacidad = filas.reduce((a, f) => a + (f.persona.semanas[i]?.capacidadHoras ?? 0), 0);
        const carga = filas.reduce((a, f) => a + (f.persona.semanas[i]?.cargaHoras ?? 0), 0);
        return { capacidad, carga };
      }),
    [filas, semanas],
  );
  const totalAtrasado = filas.reduce((a, f) => a + f.persona.horasAtrasadas, 0);
  const totalSinFechas = filas.reduce((a, f) => a + f.persona.horasSinPlanificar, 0);

  const abrirTarea = async (t: CapacidadTarea) => {
    setAbriendoTarea(t.tareaId);
    try {
      const r = await tareasApi.obtener(t.tareaId);
      setDetalle(null);
      setTareaModal({ open: true, tarea: r.data });
    } finally {
      setAbriendoTarea(null);
    }
  };

  const rangoTexto =
    semanas.length > 0
      ? `${format(semanas[0], "d MMM", { locale: es })} – ${format(addDays(semanas[semanas.length - 1], 4), "d MMM yyyy", { locale: es })}`
      : "";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Capacidad</h1>
          <p className="text-sm text-muted">¿Quién puede asumir esto? Carga planificada frente a horas disponibles, por persona y semana.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <SearchableSelect
            label="Equipo"
            options={equipos.map((e) => ({ id: e.id, label: e.nombre }))}
            value={equipoId}
            onChange={setEquipoId}
            placeholder="Todos los equipos"
          />
        </div>
        <div className="w-56">
          <TextField value={busqueda} onChange={setBusqueda}>
            <Label>Buscar persona</Label>
            <Input placeholder="Nombre o equipo..." />
          </TextField>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Semanas</span>
          <SegmentedControl ariaLabel="Número de semanas" options={OPCIONES_SEMANAS} value={numSemanas} onChange={setNumSemanas} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Ordenar por</span>
          <SegmentedControl ariaLabel="Ordenar por" options={OPCIONES_ORDEN} value={orden} onChange={setOrden} />
        </div>
        <Checkbox isSelected={soloConHueco} onChange={setSoloConHueco} className="pb-2">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Solo con hueco (&lt; {UMBRAL_HUECO} %)
          </Checkbox.Content>
        </Checkbox>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            {(["libre", "normal", "alto", "sobrecarga", "ausente"] as Nivel[]).map((n) => (
              <span key={n} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-sm ${NIVEL_ESTILO[n].muestra}`} /> {NIVEL_ESTILO[n].label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <IconUmbrella width={12} height={12} /> Días de vacaciones o festivo
            </span>
          </div>
          <p className="text-xs text-muted">
            Carga = estimación de cada tarea abierta repartida a partes iguales entre los días laborables de su inicio a su fecha objetivo (p. ej. 32 h en 2 semanas = 16 h por semana).
            Capacidad = disponibilidad semanal con vacaciones y festivos descontados.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm font-medium capitalize">{rangoTexto}</span>
          <Button isIconOnly aria-label="Semana anterior" size="sm" variant="ghost" onPress={() => setDesde((d) => addWeeks(d, -1))}>
            <IconChevronLeft />
          </Button>
          <Button size="sm" variant="ghost" onPress={() => setDesde(lunesDe(new Date()))}>
            Esta semana
          </Button>
          <Button isIconOnly aria-label="Semana siguiente" size="sm" variant="ghost" onPress={() => setDesde((d) => addWeeks(d, 1))}>
            <IconChevronRight />
          </Button>
        </div>
      </div>

      {loading && !datos ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : filas.length === 0 ? (
        <p className="text-sm text-muted">
          {datos && datos.personas.length > 0 ? "Ninguna persona coincide con los filtros." : "No hay personas activas para este filtro."}
        </p>
      ) : (
        <div className={`relative flex-1 overflow-auto rounded-xl border border-border bg-surface transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 min-w-[220px] border-b border-r border-border bg-surface px-3 py-2 text-left font-medium text-muted">
                  Persona
                </th>
                {semanas.map((lunes) => {
                  const actual = isSameDay(lunes, lunesActual);
                  return (
                    <th
                      key={lunes.toISOString()}
                      className={`sticky top-0 z-20 min-w-[96px] border-b border-border px-2 py-2 text-center font-medium whitespace-nowrap ${
                        actual ? "bg-accent-soft text-accent-soft-foreground" : "bg-surface text-muted"
                      }`}
                    >
                      Sem {getISOWeek(lunes)} · {format(lunes, "d MMM", { locale: es })}
                      {actual ? <span className="block text-[10px] font-normal">Esta semana</span> : null}
                    </th>
                  );
                })}
                <th
                  className="sticky top-0 z-20 min-w-[88px] border-b border-l border-border bg-surface px-2 py-2 text-center font-medium text-muted"
                  title="Estimación de tareas sin cerrar cuya fecha objetivo ya ha pasado"
                >
                  Atrasado
                </th>
                <th
                  className="sticky top-0 z-20 min-w-[88px] border-b border-border bg-surface px-2 py-2 text-center font-medium text-muted"
                  title="Estimación de tareas sin fecha de inicio ni objetivo"
                >
                  Sin fechas
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ persona, media }) => (
                <tr key={persona.personaId} className="group">
                  <td className="sticky left-0 z-10 border-b border-r border-border bg-surface px-3 py-1.5 group-hover:bg-surface-secondary">
                    <div className="flex items-center gap-2">
                      <PersonaAvatar id={persona.personaId} nombre={persona.nombre} size="sm" />
                      <div className="min-w-0">
                        <Link to={`/personas/${persona.personaId}`} className="block truncate text-sm font-medium hover:underline">
                          {persona.nombre}
                        </Link>
                        <span className="block truncate text-[11px] text-muted" title={persona.equipos.map((e) => e.nombre).join(", ")}>
                          {persona.equipos.length ? persona.equipos.map((e) => e.nombre).join(", ") : "Sin equipo"}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {num(persona.disponibilidadSemanalHoras)} h/sem · media {formatPct(media)}
                        </span>
                      </div>
                    </div>
                  </td>
                  {persona.semanas.map((s) => (
                    <CeldaSemana
                      key={s.lunes}
                      semana={s}
                      actual={isSameDay(parseISO(s.lunes), lunesActual)}
                      onClick={() => setDetalle({ tipo: "semana", persona, semana: s })}
                    />
                  ))}
                  <td className="border-b border-l border-border p-0">
                    <button
                      type="button"
                      disabled={persona.tareasAtrasadas.length === 0}
                      onClick={() => setDetalle({ tipo: "atrasado", persona })}
                      className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 ${
                        persona.horasAtrasadas > 0 ? "cursor-pointer bg-danger-soft font-semibold text-danger-soft-foreground hover:bg-danger-soft/70" : "text-muted"
                      }`}
                    >
                      {persona.horasAtrasadas > 0 ? (
                        <>
                          <span>{formatHoras(persona.horasAtrasadas)}</span>
                          <span className="text-[10px] font-normal">{persona.tareasAtrasadas.length} tareas</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </button>
                  </td>
                  <td className="border-b border-border p-0">
                    <button
                      type="button"
                      disabled={persona.tareasSinPlanificar.length === 0}
                      onClick={() => setDetalle({ tipo: "sinFechas", persona })}
                      className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 ${
                        persona.horasSinPlanificar > 0 ? "cursor-pointer text-foreground hover:bg-surface-secondary" : "text-muted"
                      }`}
                    >
                      {persona.horasSinPlanificar > 0 ? (
                        <>
                          <span className="font-semibold">{formatHoras(persona.horasSinPlanificar)}</span>
                          <span className="text-[10px] text-muted">{persona.tareasSinPlanificar.length} tareas</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky bottom-0 left-0 z-20 border-r border-t border-border bg-surface-secondary px-3 py-2 text-sm font-medium">
                  Total ({filas.length} {filas.length === 1 ? "persona" : "personas"})
                </td>
                {totales.map((t, i) => (
                  <td key={i} className="sticky bottom-0 z-10 border-t border-border bg-surface-secondary px-2 py-2 text-center">
                    <span className="block font-semibold">{formatPct(ocupacion(t.carga, t.capacidad))}</span>
                    <span className="block text-[11px] text-muted">
                      {num(Math.round(t.carga))} / {num(Math.round(t.capacidad))} h
                    </span>
                  </td>
                ))}
                <td className={`sticky bottom-0 z-10 border-l border-t border-border bg-surface-secondary px-2 py-2 text-center font-semibold ${totalAtrasado > 0 ? "text-danger" : "text-muted"}`}>
                  {totalAtrasado > 0 ? formatHoras(Math.round(totalAtrasado * 10) / 10) : "—"}
                </td>
                <td className="sticky bottom-0 z-10 border-t border-border bg-surface-secondary px-2 py-2 text-center font-semibold">
                  {totalSinFechas > 0 ? formatHoras(Math.round(totalSinFechas * 10) / 10) : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <DetalleModal detalle={detalle} onClose={() => setDetalle(null)} onAbrirTarea={abrirTarea} abriendoTarea={abriendoTarea} />

      <TareaFormModal
        isOpen={tareaModal.open}
        onOpenChange={(open) => setTareaModal((s) => ({ ...s, open }))}
        tarea={tareaModal.tarea}
        proyectos={proyectos}
        personas={personas}
        onSaved={recargar}
      />
    </div>
  );
}

function CeldaSemana({ semana, actual, onClick }: { semana: CapacidadSemana; actual: boolean; onClick: () => void }) {
  const nivel = nivelDe(semana);
  const pct = ocupacion(semana.cargaHoras, semana.capacidadHoras);
  const titulo = [
    `Carga ${formatHoras(semana.cargaHoras)} de ${formatHoras(semana.capacidadHoras)} disponibles`,
    semana.diasAusencia > 0 ? `${semana.diasAusencia} ${semana.diasAusencia === 1 ? "día" : "días"} de ausencia: ${semana.ausencias.join(", ")}` : null,
    semana.tareas.length > 0 ? `${semana.tareas.length} ${semana.tareas.length === 1 ? "tarea" : "tareas"}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <td className={`border-b border-border p-0 ${actual ? "border-x border-x-accent" : ""}`}>
      <button type="button" onClick={onClick} title={titulo} className={`relative flex h-14 w-full cursor-pointer flex-col items-center justify-center gap-0.5 px-2 transition-colors ${NIVEL_ESTILO[nivel].celda}`}>
        {semana.diasAusencia > 0 && nivel !== "ausente" ? (
          <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded bg-surface/70 px-1 text-[10px] text-muted">
            <IconUmbrella width={10} height={10} />
            {semana.diasAusencia}d
          </span>
        ) : null}
        {nivel === "ausente" ? (
          <>
            <IconUmbrella width={16} height={16} />
            <span className="text-[11px]">Ausente</span>
          </>
        ) : nivel === "sinCapacidad" ? (
          <span className="text-[11px]">Sin capacidad</span>
        ) : (
          <>
            <span className="text-sm font-semibold">{pct === null ? <IconWarning width={14} height={14} /> : formatPct(pct)}</span>
            <span className="text-[11px] opacity-80">
              {num(semana.cargaHoras)} / {num(semana.capacidadHoras)} h
            </span>
          </>
        )}
      </button>
    </td>
  );
}

function ListaTareas({
  tareas,
  onAbrir,
  abriendo,
  vacio,
}: {
  tareas: CapacidadTarea[];
  onAbrir: (t: CapacidadTarea) => void;
  abriendo: string | null;
  vacio: string;
}) {
  if (tareas.length === 0) return <p className="text-sm text-muted">{vacio}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {tareas.map((t) => (
        <li key={t.tareaId}>
          <button
            type="button"
            onClick={() => onAbrir(t)}
            disabled={abriendo !== null}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-secondary disabled:cursor-wait"
          >
            <span className="shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted">{t.proyectoCodigo || "—"}</span>
            <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
            {abriendo === t.tareaId ? <Spinner size="sm" /> : null}
            <span className="shrink-0 font-semibold tabular-nums">{formatHoras(t.horas)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Dato({ label, valor, className = "" }: { label: string; valor: string; className?: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-surface-secondary px-3 py-2">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={`text-base font-semibold ${className}`}>{valor}</span>
    </div>
  );
}

function DetalleModal({
  detalle,
  onClose,
  onAbrirTarea,
  abriendoTarea,
}: {
  detalle: Detalle | null;
  onClose: () => void;
  onAbrirTarea: (t: CapacidadTarea) => void;
  abriendoTarea: string | null;
}) {
  let titulo = "";
  let contenido: ReactNode = null;

  if (detalle?.tipo === "semana") {
    const { persona, semana } = detalle;
    const lunes = parseISO(semana.lunes);
    const viernes = addDays(lunes, 4);
    const pct = ocupacion(semana.cargaHoras, semana.capacidadHoras);
    const libre = semana.capacidadHoras - semana.cargaHoras;
    const nivel = nivelDe(semana);
    titulo = `${persona.nombre} · Sem ${getISOWeek(lunes)} (${format(lunes, "d MMM", { locale: es })} – ${format(viernes, "d MMM", { locale: es })})`;
    contenido = (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Dato label="Capacidad" valor={formatHoras(semana.capacidadHoras)} />
          <Dato label="Carga" valor={formatHoras(semana.cargaHoras)} />
          <Dato
            label="Ocupación"
            valor={formatPct(pct)}
            className={nivel === "sobrecarga" ? "text-danger" : nivel === "alto" ? "text-warning" : nivel === "libre" ? "text-success" : ""}
          />
          <Dato label={libre >= 0 ? "Hueco libre" : "Exceso"} valor={formatHoras(Math.round(Math.abs(libre) * 10) / 10)} className={libre < 0 ? "text-danger" : ""} />
        </div>
        <p className="text-xs text-muted">
          Disponibilidad {formatHoras(persona.disponibilidadSemanalHoras)}/semana
          {semana.diasAusencia > 0 ? ` menos ${semana.diasAusencia} ${semana.diasAusencia === 1 ? "día" : "días"} de ausencia` : ""}.
        </p>
        {semana.ausencias.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold">Ausencias</h3>
            <div className="flex flex-wrap gap-1.5">
              {semana.ausencias.map((a) => (
                <span key={a} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${a === "Vacaciones" ? "bg-warning-soft text-warning-soft-foreground" : "bg-festivo text-foreground"}`}>
                  <IconUmbrella width={12} height={12} />
                  {a}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold">Tareas esta semana</h3>
          <ListaTareas tareas={semana.tareas} onAbrir={onAbrirTarea} abriendo={abriendoTarea} vacio="Sin tareas planificadas en esta semana." />
        </div>
        {persona.horasAtrasadas > 0 || persona.horasSinPlanificar > 0 ? (
          <p className="text-xs text-muted">
            Además tiene {persona.horasAtrasadas > 0 ? `${formatHoras(persona.horasAtrasadas)} atrasadas` : ""}
            {persona.horasAtrasadas > 0 && persona.horasSinPlanificar > 0 ? " y " : ""}
            {persona.horasSinPlanificar > 0 ? `${formatHoras(persona.horasSinPlanificar)} sin fechas` : ""} que no se cuentan en ninguna semana.
          </p>
        ) : null}
      </>
    );
  } else if (detalle?.tipo === "atrasado") {
    const { persona } = detalle;
    titulo = `${persona.nombre} · Trabajo atrasado`;
    contenido = (
      <>
        <p className="text-sm text-muted">
          Tareas sin cerrar cuya fecha objetivo ya ha pasado ({formatHoras(persona.horasAtrasadas)} estimadas). Su carga cayó en semanas pasadas; conviene replanificarlas:
          replanifícalas para que cuenten en la carga.
        </p>
        <ListaTareas tareas={persona.tareasAtrasadas} onAbrir={onAbrirTarea} abriendo={abriendoTarea} vacio="Sin tareas atrasadas." />
      </>
    );
  } else if (detalle?.tipo === "sinFechas") {
    const { persona } = detalle;
    titulo = `${persona.nombre} · Tareas sin fechas`;
    contenido = (
      <>
        <p className="text-sm text-muted">
          Tareas abiertas sin fecha de inicio ni objetivo ({formatHoras(persona.horasSinPlanificar)} estimadas). Ponles fechas para situarlas en la matriz.
        </p>
        <ListaTareas tareas={persona.tareasSinPlanificar} onAbrir={onAbrirTarea} abriendo={abriendoTarea} vacio="Sin tareas sin fechas." />
      </>
    );
  }

  return (
    <FormModal isOpen={detalle !== null} onOpenChange={(open) => !open && onClose()} title={titulo} size="lg">
      {contenido}
    </FormModal>
  );
}
