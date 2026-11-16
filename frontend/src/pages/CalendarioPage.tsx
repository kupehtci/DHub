import { Button, Spinner } from "@heroui/react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EventoFormModal } from "../components/EventoFormModal";
import { HitoFormModal } from "../components/HitoFormModal";
import { IconChevronLeft, IconChevronRight, IconFlag, IconPlus } from "../components/Icons";
import { StatusChip } from "../components/StatusChip";
import { PrioridadChip } from "../components/PrioridadChip";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { equiposApi, eventosApi, hitosApi, personasApi, proyectosApi, tareasApi } from "../lib/api";
import { ESTADO_HITO_COLOR, ESTADO_HITO_LABEL, ESTADO_TAREA_LABEL, formatHora, TIPO_EVENTO_COLOR, TIPO_EVENTO_LABEL } from "../lib/format";
import type { Equipo, Evento, HitoListado, Persona, Proyecto, Tarea } from "../types";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarioPage() {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [hitos, setHitos] = useState<HitoListado[]>([]);
  const [hitoAbierto, setHitoAbierto] = useState<HitoListado | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; evento: Evento | null }>({ open: false, evento: null });

  const inicioGrid = useMemo(() => startOfWeek(startOfMonth(mes), { weekStartsOn: 1 }), [mes]);
  const finGrid = useMemo(() => endOfWeek(endOfMonth(mes), { weekStartsOn: 1 }), [mes]);

  const dias = useMemo(() => {
    const result: Date[] = [];
    let cursor = inicioGrid;
    while (cursor <= finGrid) {
      result.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return result;
  }, [inicioGrid, finGrid]);

  const cargar = () => {
    setLoading(true);
    Promise.all([
      eventosApi.listar({ desde: inicioGrid.toISOString(), hasta: finGrid.toISOString() }),
      tareasApi.listar(),
      proyectosApi.listar(),
      equiposApi.listar(),
      personasApi.listar(),
      hitosApi.listar({ desde: format(inicioGrid, "yyyy-MM-dd"), hasta: format(finGrid, "yyyy-MM-dd") }),
    ])
      .then(([ev, ta, pr, eq, pe, hi]) => {
        setEventos(ev.data);
        setHitos(hi.data);
        setTareas(ta.data);
        setProyectos(pr.data);
        setEquipos(eq.data);
        setPersonas(pe.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [mes]);

  const eventosPorDia = (dia: Date) => eventos.filter((e) => isSameDay(new Date(e.fechaInicio), dia));
  const hitosPorDia = (dia: Date) => hitos.filter((h) => h.fecha === format(dia, "yyyy-MM-dd"));
  const tareasPorDia = (dia: Date) => tareas.filter((t) => t.fechaObjetivo && isSameDay(new Date(t.fechaObjetivo), dia));

  const eventosDelDiaSeleccionado = eventosPorDia(diaSeleccionado).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  const tareasDelDiaSeleccionado = tareasPorDia(diaSeleccionado);
  const hitosDelDiaSeleccionado = hitosPorDia(diaSeleccionado);

  const defaultFechaInicio = useMemo(() => {
    const fecha = new Date(diaSeleccionado);
    if (isToday(fecha)) {
      fecha.setHours(fecha.getHours() + 1, 0, 0, 0);
    } else {
      fecha.setHours(9, 0, 0, 0);
    }
    return format(fecha, "yyyy-MM-dd'T'HH:mm");
  }, [diaSeleccionado]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendario</h1>
          <p className="text-sm text-muted">Eventos, hitos de proyecto y tareas por fecha objetivo, día a día.</p>
        </div>
        <Button onPress={() => setModal({ open: true, evento: null })}>
          <IconPlus />
          Nuevo evento
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize">{format(mes, "MMMM yyyy", { locale: es })}</h2>
            <div className="flex items-center gap-1">
              <Button isIconOnly aria-label="Mes anterior" size="sm" variant="ghost" onPress={() => setMes((m) => addMonths(m, -1))}>
                <IconChevronLeft />
              </Button>
              <Button size="sm" variant="ghost" onPress={() => setMes(startOfMonth(new Date()))}>
                Hoy
              </Button>
              <Button isIconOnly aria-label="Mes siguiente" size="sm" variant="ghost" onPress={() => setMes((m) => addMonths(m, 1))}>
                <IconChevronRight />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="px-1 pb-1 text-center text-xs font-medium text-muted">
                  {d}
                </div>
              ))}
              {dias.map((dia) => {
                const evs = eventosPorDia(dia);
                const tas = tareasPorDia(dia);
                const his = hitosPorDia(dia);
                // Máximo 3 líneas por día: primero hitos, luego eventos y después tareas.
                const huecos = 3;
                const hitosVis = his.slice(0, huecos);
                const evsVis = evs.slice(0, huecos - hitosVis.length);
                const tasVis = tas.slice(0, huecos - hitosVis.length - evsVis.length);
                const resto = his.length + evs.length + tas.length - hitosVis.length - evsVis.length - tasVis.length;
                const seleccionado = isSameDay(dia, diaSeleccionado);
                return (
                  <button
                    key={dia.toISOString()}
                    onClick={() => setDiaSeleccionado(dia)}
                    className={`flex h-28 flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                      seleccionado ? "border-accent bg-accent-soft/40" : "border-border hover:bg-surface-secondary"
                    } ${!isSameMonth(dia, mes) ? "opacity-40" : ""}`}
                  >
                    <span className={`text-xs font-medium ${isToday(dia) ? "flex size-5 items-center justify-center rounded-full bg-accent text-accent-foreground" : "text-foreground"}`}>
                      {format(dia, "d")}
                    </span>
                    <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                      {hitosVis.map((h) => (
                        <span key={h.id} className="flex items-center gap-0.5 truncate rounded bg-success-soft px-1 text-[10px] font-medium text-success">
                          <IconFlag width={10} height={10} className="shrink-0" />
                          <span className="truncate">{h.nombre}</span>
                        </span>
                      ))}
                      {evsVis.map((e) => (
                        <span key={e.id} className="truncate rounded bg-accent-soft px-1 text-[10px] text-accent-soft-foreground">
                          {formatHora(e.fechaInicio)} {e.titulo}
                        </span>
                      ))}
                      {tasVis.map((t) => (
                        <span key={t.id} className="truncate rounded bg-surface-tertiary px-1 text-[10px] text-muted">
                          {t.titulo}
                        </span>
                      ))}
                      {resto > 0 ? <span className="text-[10px] text-muted">+{resto} más</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold capitalize">{format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es })}</h3>
            <Button size="sm" variant="ghost" onPress={() => setModal({ open: true, evento: null })}>
              <IconPlus />
            </Button>
          </div>

          {hitosDelDiaSeleccionado.length ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted">HITOS</p>
              {hitosDelDiaSeleccionado.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setHitoAbierto(h)}
                  className="flex flex-col gap-1 rounded-lg border border-success/30 bg-success-soft/30 px-3 py-2 text-left text-sm hover:bg-success-soft/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <IconFlag width={14} height={14} className="text-success" />
                      {h.nombre}
                    </span>
                    <StatusChip color={ESTADO_HITO_COLOR[h.estado]} label={ESTADO_HITO_LABEL[h.estado]} />
                  </div>
                  <span className="text-xs text-muted">
                    {h.proyectoCodigo} · {h.proyectoNombre}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted">EVENTOS</p>
            {eventosDelDiaSeleccionado.length === 0 ? (
              <p className="text-sm text-muted">Sin eventos.</p>
            ) : (
              eventosDelDiaSeleccionado.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setModal({ open: true, evento: e })}
                  className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-surface-secondary"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{e.titulo}</span>
                    <StatusChip color={TIPO_EVENTO_COLOR[e.tipo]} label={TIPO_EVENTO_LABEL[e.tipo]} />
                  </div>
                  <span className="text-xs text-muted">
                    {formatHora(e.fechaInicio)}
                    {e.fechaFin ? ` – ${formatHora(e.fechaFin)}` : ""}
                    {e.proyectoNombre ? ` · ${e.proyectoNombre}` : ""}
                    {e.equipoNombre ? ` · ${e.equipoNombre}` : ""}
                    {e.personaNombre ? ` · ${e.personaNombre}` : ""}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted">TAREAS CON FECHA OBJETIVO</p>
            {tareasDelDiaSeleccionado.length === 0 ? (
              <p className="text-sm text-muted">Sin tareas para este día.</p>
            ) : (
              tareasDelDiaSeleccionado.map((t) => (
                <Link
                  key={t.id}
                  to={`/proyectos/${t.proyectoId}`}
                  className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{t.titulo}</span>
                    <PrioridadChip prioridad={t.prioridad} />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    {t.proyectoCodigo} ·
                    {t.responsableId ? <PersonaAvatar id={t.responsableId} nombre={t.responsableNombre ?? ""} size="sm" /> : null}
                    {t.responsableNombre ?? "Sin responsable"} · {ESTADO_TAREA_LABEL[t.estado]}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <EventoFormModal
        isOpen={modal.open}
        onOpenChange={(open) => setModal((s) => ({ ...s, open }))}
        evento={modal.evento}
        defaultFechaInicio={defaultFechaInicio}
        equipos={equipos}
        personas={personas}
        proyectos={proyectos}
        onSaved={cargar}
      />

      <HitoFormModal
        isOpen={hitoAbierto !== null}
        onOpenChange={(open) => !open && setHitoAbierto(null)}
        hito={hitoAbierto}
        proyectos={proyectos}
        onSaved={cargar}
      />
    </div>
  );
}
