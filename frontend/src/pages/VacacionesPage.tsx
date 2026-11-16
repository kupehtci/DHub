import { Button, Spinner } from "@heroui/react";
import { addDays, addMonths, endOfMonth, format, getDay, isToday, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconDownload, IconPlus } from "../components/Icons";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { SelectField } from "../components/SelectField";
import { VacacionFormModal, type TipoAusencia } from "../components/VacacionFormModal";
import { equiposApi, festivosApi, personasApi, vacacionesApi } from "../lib/api";
import { AMBITO_FESTIVO_LABEL } from "../lib/format";
import type { Equipo, Festivo, Persona, Vacacion } from "../types";

function claveDia(dia: Date): string {
  return format(dia, "yyyy-MM-dd");
}

export default function VacacionesPage() {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  // Todas las personas: el filtro de equipo se aplica en pantalla, pero un festivo puede afectar a cualquiera.
  const [todasLasPersonas, setTodasLasPersonas] = useState<Persona[]>([]);
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [exportando, setExportando] = useState(false);
  const [filtroEquipo, setFiltroEquipo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    vacacion: Vacacion | null;
    festivo: Festivo | null;
    tipo?: TipoAusencia;
    personaId?: string;
    fecha?: string;
  }>({ open: false, vacacion: null, festivo: null });

  const inicioMes = startOfMonth(mes);
  const finMes = endOfMonth(mes);

  const dias = useMemo(() => {
    const result: Date[] = [];
    let cursor = inicioMes;
    while (cursor <= finMes) {
      result.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  const cargar = () => {
    setLoading(true);
    const rango = { desde: claveDia(inicioMes), hasta: claveDia(finMes) };
    Promise.all([equiposApi.listar(), personasApi.listar(), vacacionesApi.listar(rango), festivosApi.listar(rango)])
      .then(([eq, pe, va, fe]) => {
        setEquipos(eq.data);
        setTodasLasPersonas(pe.data);
        setVacaciones(va.data);
        setFestivos(fe.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [mes]);

  const personas = useMemo(
    () => (filtroEquipo ? todasLasPersonas.filter((p) => p.equipos.some((e) => e.id === filtroEquipo)) : todasLasPersonas),
    [todasLasPersonas, filtroEquipo],
  );

  const festivoEnDia = (personaId: string, dia: Date) => {
    const clave = claveDia(dia);
    return festivos.find((f) => f.personaIds.includes(personaId) && clave >= f.fechaInicio && clave <= f.fechaFin);
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const anio = mes.getFullYear();
      await vacacionesApi.exportar({ desde: `${anio}-01-01`, hasta: `${anio}-12-31`, equipoId: filtroEquipo ?? undefined });
    } finally {
      setExportando(false);
    }
  };

  const vacacionEnDia = (personaId: string, dia: Date) => {
    const clave = claveDia(dia);
    return vacaciones.find((v) => v.personaId === personaId && clave >= v.fechaInicio && clave <= v.fechaFin);
  };

  const diasDelMes = (personaId: string) => dias.filter((d) => vacacionEnDia(personaId, d)).length;

  const abrirCelda = (persona: Persona, dia: Date) => {
    const existente = vacacionEnDia(persona.id, dia);
    const festivo = festivoEnDia(persona.id, dia);
    if (existente) {
      setModal({ open: true, vacacion: existente, festivo: null });
    } else if (festivo) {
      setModal({ open: true, vacacion: null, festivo });
    } else {
      setModal({ open: true, vacacion: null, festivo: null, tipo: "vacaciones", personaId: persona.id, fecha: claveDia(dia) });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vacaciones</h1>
          <p className="text-sm text-muted">Quién está de vacaciones y cuándo, por equipo y por persona.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <SelectField emptyOption="Todos los equipos" label="Equipo" options={equipos.map((e) => ({ id: e.id, label: e.nombre }))} value={filtroEquipo} onChange={setFiltroEquipo} />
          </div>
          <Button isPending={exportando} variant="secondary" onPress={exportar}>
            <IconDownload />
            Exportar {mes.getFullYear()} a Excel
          </Button>
          <Button variant="secondary" onPress={() => setModal({ open: true, vacacion: null, festivo: null, tipo: "festivo" })}>
            <IconPlus />
            Nuevo festivo
          </Button>
          <Button onPress={() => setModal({ open: true, vacacion: null, festivo: null, tipo: "vacaciones" })}>
            <IconPlus />
            Nueva vacación
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-lg font-semibold capitalize">{format(mes, "MMMM yyyy", { locale: es })}</h2>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-warning-soft ring-1 ring-warning/40" /> Vacaciones
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-festivo ring-1 ring-festivo-borde" /> Festivo
            </span>
          </div>
        </div>
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
      ) : personas.length === 0 ? (
        <p className="text-sm text-muted">No hay personas para este filtro.</p>
      ) : (
        <div className="flex-1 overflow-auto rounded-xl border border-border bg-surface">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 min-w-[180px] border-b border-r border-border bg-surface px-3 py-2 text-left font-medium text-muted">
                  Persona
                </th>
                {dias.map((d) => (
                  <th
                    key={d.toISOString()}
                    className={`sticky top-0 z-10 w-8 border-b border-border py-2 text-center font-medium ${
                      getDay(d) === 0 || getDay(d) === 6 ? "bg-surface-secondary text-muted" : "bg-surface text-muted"
                    } ${isToday(d) ? "text-accent-soft-foreground" : ""}`}
                  >
                    {format(d, "d")}
                  </th>
                ))}
                <th className="sticky top-0 z-10 min-w-[70px] border-b border-l border-border bg-surface py-2 text-center font-medium text-muted">Días</th>
              </tr>
            </thead>
            <tbody>
              {personas.map((persona) => (
                <tr key={persona.id} className="group">
                  <td className="sticky left-0 z-10 border-r border-b border-border bg-surface px-3 py-1.5 group-hover:bg-surface-secondary">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <PersonaAvatar id={persona.id} nombre={persona.nombre} size="sm" />
                      {persona.nombre}
                    </span>
                  </td>
                  {dias.map((dia) => {
                    const vac = vacacionEnDia(persona.id, dia);
                    const fest = festivoEnDia(persona.id, dia);
                    const fds = getDay(dia) === 0 || getDay(dia) === 6;
                    const titulo = [
                      vac ? `Vacaciones: ${vac.fechaInicio} → ${vac.fechaFin}${vac.comentario ? ` · ${vac.comentario}` : ""}` : null,
                      fest ? `Festivo ${AMBITO_FESTIVO_LABEL[fest.ambito].toLowerCase()}: ${fest.nombre}` : null,
                    ]
                      .filter(Boolean)
                      .join("\n");
                    return (
                      <td
                        key={dia.toISOString()}
                        onClick={() => abrirCelda(persona, dia)}
                        title={titulo ? `${persona.nombre}\n${titulo}` : undefined}
                        className={`h-9 cursor-pointer border-b border-border text-center transition-colors ${
                          vac
                            ? "bg-warning-soft hover:bg-warning-soft-hover"
                            : fest
                              ? "bg-festivo hover:brightness-95"
                              : fds
                                ? "bg-surface-secondary hover:bg-warning-soft/40"
                                : "hover:bg-warning-soft/40"
                        } ${vac && fest ? "shadow-[inset_0_-4px_0_var(--festivo-borde)]" : ""} ${isToday(dia) ? "border-x border-x-accent" : ""}`}
                      />
                    );
                  })}
                  <td className="border-b border-l border-border py-1.5 text-center text-muted">{diasDelMes(persona.id) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VacacionFormModal
        isOpen={modal.open}
        onOpenChange={(open) => setModal((s) => ({ ...s, open }))}
        vacacion={modal.vacacion}
        festivo={modal.festivo}
        defaultTipo={modal.tipo}
        defaultPersonaId={modal.personaId}
        defaultFecha={modal.fecha}
        personas={todasLasPersonas}
        equipos={equipos}
        onSaved={cargar}
      />
    </div>
  );
}
