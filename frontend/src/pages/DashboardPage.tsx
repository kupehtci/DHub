import { Card, Spinner } from "@heroui/react";
import { endOfDay, format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { EventoFormModal } from "../components/EventoFormModal";
import { FormModal } from "../components/FormModal";
import { IconCalendar, IconFolder, IconUmbrella, IconUsers, IconWarning } from "../components/Icons";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { PrioridadChip } from "../components/PrioridadChip";
import { SearchableSelect } from "../components/SearchableSelect";
import { StatCard } from "../components/StatCard";
import { StatusChip } from "../components/StatusChip";
import { TareaFormModal } from "../components/TareaFormModal";
import { dashboardApi, equiposApi, eventosApi, personasApi, proyectosApi } from "../lib/api";
import {
  ESTADO_HITO_COLOR,
  ESTADO_HITO_LABEL,
  ESTADO_PROYECTO_COLOR,
  ESTADO_PROYECTO_LABEL,
  ESTADO_TAREA_COLOR,
  ESTADO_TAREA_LABEL,
  formatFecha,
  formatHora,
  IMPACTO_COLOR,
  IMPACTO_LABEL,
  TIPO_EVENTO_COLOR,
  TIPO_EVENTO_LABEL,
} from "../lib/format";
import type { Dashboard, Equipo, Evento, Hito, Persona, Proyecto, Riesgo, Tarea } from "../types";

type Detalle = "activos" | "enRiesgo" | "vencidas" | "bloqueadas" | "sinResponsable" | "riesgos";

const DETALLE_TITULO: Record<Detalle, string> = {
  activos: "Proyectos activos",
  enRiesgo: "Proyectos en riesgo",
  vencidas: "Tareas vencidas",
  bloqueadas: "Tareas bloqueadas",
  sinResponsable: "Tareas sin responsable",
  riesgos: "Riesgos altos y críticos",
};

// Altura máxima de las listas del dashboard: a partir de ahí hacen scroll.
const LISTA_SCROLL = "flex max-h-80 flex-col gap-2 overflow-y-auto pr-1";

// ---------------------------------------------------------------------------
// Filas reutilizables (se usan en las tarjetas y en el detalle de los KPI)
// ---------------------------------------------------------------------------

function ProyectoFila({ p }: { p: Proyecto }) {
  return (
    <Link
      to={`/proyectos/${p.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {p.codigo} · {p.nombre}
        </p>
        <p className="text-xs text-muted">
          {p.equipoNombre ?? "Sin equipo"}
          {p.tareasVencidas ? <span className="text-danger"> · {p.tareasVencidas} vencidas</span> : null}
          {p.riesgosAltos ? <span className="text-warning"> · {p.riesgosAltos} riesgos altos</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PrioridadChip prioridad={p.prioridad} />
        <StatusChip color={ESTADO_PROYECTO_COLOR[p.estado]} label={ESTADO_PROYECTO_LABEL[p.estado]} />
      </div>
    </Link>
  );
}

function TareaFila({ t, onOpen, extra, tono = "normal" }: { t: Tarea; onOpen: (t: Tarea) => void; extra?: ReactNode; tono?: "normal" | "danger" }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(t)}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
        tono === "danger" ? "border-danger/20 bg-danger-soft/40 hover:bg-danger-soft/70" : "border-border hover:bg-surface-secondary"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{t.titulo}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {t.proyectoCodigo} ·
          {t.responsableId ? <PersonaAvatar id={t.responsableId} nombre={t.responsableNombre ?? ""} size="sm" /> : null}
          {t.responsableNombre ?? "Sin responsable"}
          {extra}
        </p>
        {t.estado === "Bloqueada" && t.motivoBloqueo ? (
          <p className="truncate text-xs text-danger" title={t.motivoBloqueo}>
            Motivo: {t.motivoBloqueo}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PrioridadChip prioridad={t.prioridad} />
        <StatusChip color={ESTADO_TAREA_COLOR[t.estado]} label={ESTADO_TAREA_LABEL[t.estado]} />
      </div>
    </button>
  );
}

function RiesgoFila({ r }: { r: Riesgo }) {
  return (
    <Link
      to={r.proyectoId ? `/proyectos/${r.proyectoId}` : "/riesgos"}
      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{r.titulo}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          {r.proyectoNombre ?? "—"} ·
          {r.responsableId ? <PersonaAvatar id={r.responsableId} nombre={r.responsableNombre ?? ""} size="sm" /> : null}
          {r.responsableNombre ?? "Sin responsable"}
        </p>
      </div>
      <StatusChip color={IMPACTO_COLOR[r.impacto]} label={IMPACTO_LABEL[r.impacto]} />
    </Link>
  );
}

function HitoFila({ h, proyecto }: { h: Hito; proyecto?: Proyecto }) {
  return (
    <Link
      to={`/proyectos/${h.proyectoId}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{h.nombre}</p>
        <p className="text-xs text-muted">
          {proyecto ? `${proyecto.codigo} · ` : ""}
          {formatFecha(h.fecha)}
        </p>
      </div>
      <StatusChip color={ESTADO_HITO_COLOR[h.estado]} label={ESTADO_HITO_LABEL[h.estado]} />
    </Link>
  );
}

function Vacio({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

function ListaCard({ titulo, descripcion, contador, children }: { titulo: string; descripcion?: string; contador?: number; children: ReactNode }) {
  return (
    <Card className="gap-3">
      <Card.Header>
        <Card.Title className="flex items-center gap-2">
          {titulo}
          {contador !== undefined ? <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-muted">{contador}</span> : null}
        </Card.Title>
        {descripcion ? <Card.Description>{descripcion}</Card.Description> : null}
      </Card.Header>
      <Card.Content className={LISTA_SCROLL}>{children}</Card.Content>
    </Card>
  );
}

// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [todosProyectos, setTodosProyectos] = useState<Proyecto[]>([]);
  const [equipoId, setEquipoId] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [eventosHoy, setEventosHoy] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [tareaAbierta, setTareaAbierta] = useState<Tarea | null>(null);
  const [eventoAbierto, setEventoAbierto] = useState<Evento | null>(null);

  // Momento de carga de la página: fija "hoy" y sirve para atenuar los eventos ya pasados.
  const [hoy] = useState(() => new Date());
  const hoyIso = format(hoy, "yyyy-MM-dd");

  useEffect(() => {
    // Catálogos para los filtros y para poder abrir tareas y eventos desde aquí.
    Promise.all([equiposApi.listar(), personasApi.listar(), proyectosApi.listar()]).then(([eq, pe, pr]) => {
      setEquipos(eq.data);
      setPersonas(pe.data);
      setTodosProyectos(pr.data);
    });
  }, []);

  const cargar = useCallback(
    (conSpinner = true) => {
      if (conSpinner) setLoading(true);
      Promise.all([
        dashboardApi.obtener({ equipoId: equipoId ?? undefined, hoy: hoyIso }),
        eventosApi.listar({ desde: startOfDay(hoy).toISOString(), hasta: endOfDay(hoy).toISOString() }),
      ])
        .then(([d, ev]) => {
          setData(d.data);
          setEventosHoy(ev.data);
        })
        .finally(() => setLoading(false));
    },
    [equipoId, hoy, hoyIso],
  );

  useEffect(() => cargar(), [cargar]);

  const proyectoPorId = useMemo(() => new Map((data?.proyectos ?? []).map((p) => [p.id, p])), [data]);

  // Con un equipo seleccionado, solo los eventos relacionados con él (por equipo, proyecto o
  // persona) y los generales sin ninguna vinculación.
  const eventosFiltrados = useMemo(() => {
    const ordenados = [...eventosHoy].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
    if (!equipoId) return ordenados;
    const miembros = new Set(personas.filter((p) => p.equipos.some((e) => e.id === equipoId)).map((p) => p.id));
    return ordenados.filter(
      (e) =>
        e.equipoId === equipoId ||
        (e.proyectoId && proyectoPorId.has(e.proyectoId)) ||
        (e.personaId && miembros.has(e.personaId)) ||
        (!e.equipoId && !e.proyectoId && !e.personaId),
    );
  }, [eventosHoy, equipoId, personas, proyectoPorId]);

  const hitosHoy = useMemo(() => (data?.proximosHitos ?? []).filter((h) => h.fecha === hoyIso), [data, hoyIso]);

  const abrirTarea = (t: Tarea) => {
    setDetalle(null);
    setTareaAbierta(t);
  };

  const renderDetalle = (d: Detalle): ReactNode => {
    if (!data) return null;
    const vacio = <Vacio>No hay elementos.</Vacio>;
    switch (d) {
      case "activos": {
        const lista = data.proyectos.filter((p) => p.estado === "EnCurso");
        return lista.length ? lista.map((p) => <ProyectoFila key={p.id} p={p} />) : vacio;
      }
      case "enRiesgo": {
        const ids = new Set(data.proyectosEnRiesgoIds);
        const lista = data.proyectos.filter((p) => ids.has(p.id));
        return lista.length ? (
          <>
            <p className="text-xs text-muted">Proyectos con tareas vencidas o con riesgos altos/críticos abiertos.</p>
            {lista.map((p) => (
              <ProyectoFila key={p.id} p={p} />
            ))}
          </>
        ) : (
          vacio
        );
      }
      case "vencidas":
        return data.tareasVencidasList.length
          ? data.tareasVencidasList.map((t) => <TareaFila key={t.id} t={t} tono="danger" onOpen={abrirTarea} extra={<> · objetivo {formatFecha(t.fechaObjetivo)}</>} />)
          : vacio;
      case "bloqueadas":
        return data.tareasBloqueadasList.length ? data.tareasBloqueadasList.map((t) => <TareaFila key={t.id} t={t} onOpen={abrirTarea} />) : vacio;
      case "sinResponsable":
        return data.tareasSinResponsableList.length ? data.tareasSinResponsableList.map((t) => <TareaFila key={t.id} t={t} onOpen={abrirTarea} />) : vacio;
      case "riesgos":
        return data.riesgosAltosList.length ? data.riesgosAltosList.map((r) => <RiesgoFila key={r.id} r={r} />) : vacio;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">Estado general de proyectos, tareas y riesgos.</p>
        </div>
        <div className="w-64">
          <SearchableSelect
            label="Equipo"
            options={equipos.map((e) => ({ id: e.id, label: e.nombre }))}
            value={equipoId}
            onChange={setEquipoId}
            placeholder="Todos los equipos"
            emptyText="No hay equipos que coincidan"
          />
        </div>
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* ---------------- Hoy ---------------- */}
          <Card className="gap-4 border border-accent/30">
            <Card.Header>
              <Card.Title className="flex items-center gap-2 text-lg">
                <IconCalendar />
                Hoy · <span className="capitalize">{format(hoy, "EEEE d 'de' MMMM", { locale: es })}</span>
              </Card.Title>
              <Card.Description>Eventos del calendario, tareas que empiezan o vencen hoy y quién está ausente.</Card.Description>
            </Card.Header>
            <Card.Content className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                  Agenda ({eventosFiltrados.length + hitosHoy.length})
                </h3>
                <div className={LISTA_SCROLL}>
                  {eventosFiltrados.length === 0 && hitosHoy.length === 0 ? <Vacio>Sin eventos ni hitos hoy.</Vacio> : null}
                  {eventosFiltrados.map((e) => {
                    const pasado = new Date(e.fechaFin ?? e.fechaInicio) < hoy;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setEventoAbierto(e)}
                        className={`flex w-full items-start gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-surface-secondary ${pasado ? "opacity-60" : ""}`}
                      >
                        <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-muted">
                          {formatHora(e.fechaInicio)}
                          {e.fechaFin ? <span className="block">{formatHora(e.fechaFin)}</span> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">{e.titulo}</span>
                          <span className="block truncate text-xs text-muted">
                            {[e.proyectoNombre, e.equipoNombre, e.personaNombre].filter(Boolean).join(" · ") || "General"}
                          </span>
                        </span>
                        <StatusChip color={TIPO_EVENTO_COLOR[e.tipo]} label={TIPO_EVENTO_LABEL[e.tipo]} />
                      </button>
                    );
                  })}
                  {hitosHoy.map((h) => (
                    <HitoFila key={h.id} h={h} proyecto={proyectoPorId.get(h.proyectoId)} />
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Tareas de hoy ({data.tareasHoyList.length})</h3>
                <div className={LISTA_SCROLL}>
                  {data.tareasHoyList.length === 0 ? <Vacio>Ninguna tarea empieza ni vence hoy.</Vacio> : null}
                  {data.tareasHoyList.map((t) => (
                    <TareaFila
                      key={t.id}
                      t={t}
                      onOpen={abrirTarea}
                      extra={
                        t.fechaObjetivo === hoyIso ? (
                          <span className="font-medium text-warning"> · vence hoy</span>
                        ) : (
                          <span className="text-accent"> · empieza hoy</span>
                        )
                      }
                    />
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Ausencias ({data.ausenciasHoy.length})</h3>
                <div className={LISTA_SCROLL}>
                  {data.ausenciasHoy.length === 0 ? <Vacio>Hoy está todo el mundo.</Vacio> : null}
                  {data.ausenciasHoy.map((a) => (
                    <Link
                      key={`${a.personaId}-${a.tipo}-${a.detalle}`}
                      to="/vacaciones"
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <PersonaAvatar id={a.personaId} nombre={a.personaNombre} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">{a.personaNombre}</span>
                          <span className="block truncate text-xs text-muted">
                            {a.detalle ? `${a.detalle} · ` : ""}hasta {formatFecha(a.fechaFin)}
                          </span>
                        </span>
                      </span>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                          a.tipo === "Festivo" ? "bg-festivo text-foreground" : "bg-warning-soft text-warning"
                        }`}
                      >
                        <IconUmbrella width={12} height={12} />
                        {a.tipo}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            </Card.Content>
          </Card>

          {/* ---------------- KPIs ---------------- */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Proyectos activos" value={data.proyectosActivos} tone="accent" icon={<IconFolder />} onClick={() => setDetalle("activos")} />
            <StatCard label="Proyectos en riesgo" value={data.proyectosEnRiesgo} tone="warning" icon={<IconWarning />} onClick={() => setDetalle("enRiesgo")} />
            <StatCard label="Tareas vencidas" value={data.tareasVencidas} tone="danger" onClick={() => setDetalle("vencidas")} />
            <StatCard label="Tareas bloqueadas" value={data.tareasBloqueadas} tone="danger" onClick={() => setDetalle("bloqueadas")} />
            <StatCard label="Sin responsable" value={data.tareasSinResponsable} tone="warning" icon={<IconUsers />} onClick={() => setDetalle("sinResponsable")} />
            <StatCard label="Riesgos altos/críticos" value={data.riesgosAltos} tone="danger" icon={<IconWarning />} onClick={() => setDetalle("riesgos")} />
          </div>

          {/* ---------------- Listas ---------------- */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ListaCard titulo="Proyectos" descripcion="Estado de los proyectos del alcance seleccionado" contador={data.proyectos.length}>
              {data.proyectos.length === 0 ? <Vacio>No hay proyectos para este filtro.</Vacio> : data.proyectos.map((p) => <ProyectoFila key={p.id} p={p} />)}
            </ListaCard>

            <ListaCard titulo="Próximos hitos" descripcion="Pendientes hasta dentro de 30 días" contador={data.proximosHitos.length}>
              {data.proximosHitos.length === 0 ? (
                <Vacio>No hay hitos próximos.</Vacio>
              ) : (
                data.proximosHitos.map((h) => <HitoFila key={h.id} h={h} proyecto={proyectoPorId.get(h.proyectoId)} />)
              )}
            </ListaCard>

            <ListaCard titulo="Tareas vencidas" contador={data.tareasVencidasList.length}>
              {data.tareasVencidasList.length === 0 ? (
                <Vacio>Sin tareas vencidas. 🎉</Vacio>
              ) : (
                data.tareasVencidasList.map((t) => (
                  <TareaFila key={t.id} t={t} tono="danger" onOpen={abrirTarea} extra={<> · objetivo {formatFecha(t.fechaObjetivo)}</>} />
                ))
              )}
            </ListaCard>

            <ListaCard titulo="Riesgos altos y críticos" contador={data.riesgosAltosList.length}>
              {data.riesgosAltosList.length === 0 ? <Vacio>Sin riesgos altos abiertos.</Vacio> : data.riesgosAltosList.map((r) => <RiesgoFila key={r.id} r={r} />)}
            </ListaCard>

            <ListaCard titulo="Tareas bloqueadas" contador={data.tareasBloqueadasList.length}>
              {data.tareasBloqueadasList.length === 0 ? (
                <Vacio>Nada bloqueado.</Vacio>
              ) : (
                data.tareasBloqueadasList.map((t) => <TareaFila key={t.id} t={t} onOpen={abrirTarea} />)
              )}
            </ListaCard>

            <ListaCard titulo="Tareas sin responsable" contador={data.tareasSinResponsableList.length}>
              {data.tareasSinResponsableList.length === 0 ? (
                <Vacio>Todas las tareas abiertas tienen responsable.</Vacio>
              ) : (
                data.tareasSinResponsableList.map((t) => <TareaFila key={t.id} t={t} onOpen={abrirTarea} />)
              )}
            </ListaCard>
          </div>
        </>
      )}

      <FormModal
        isOpen={detalle !== null}
        onOpenChange={(open) => !open && setDetalle(null)}
        title={detalle ? DETALLE_TITULO[detalle] : ""}
        size="lg"
      >
        <div className="flex flex-col gap-2">{detalle ? renderDetalle(detalle) : null}</div>
      </FormModal>

      <TareaFormModal
        isOpen={tareaAbierta !== null}
        onOpenChange={(open) => !open && setTareaAbierta(null)}
        tarea={tareaAbierta}
        proyectos={todosProyectos}
        personas={personas}
        onSaved={() => cargar(false)}
      />

      <EventoFormModal
        isOpen={eventoAbierto !== null}
        onOpenChange={(open) => !open && setEventoAbierto(null)}
        evento={eventoAbierto}
        proyectos={todosProyectos}
        equipos={equipos}
        personas={personas}
        onSaved={() => cargar(false)}
      />
    </div>
  );
}
