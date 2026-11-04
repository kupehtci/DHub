import { Button, Spinner } from "@heroui/react";
import { addDays, addMonths, endOfMonth, format, getDay, isToday, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconPlus } from "../components/Icons";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { SelectField } from "../components/SelectField";
import { VacacionFormModal } from "../components/VacacionFormModal";
import { equiposApi, personasApi, vacacionesApi } from "../lib/api";
import type { Equipo, Persona, Vacacion } from "../types";

function claveDia(dia: Date): string {
  return format(dia, "yyyy-MM-dd");
}

export default function VacacionesPage() {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [filtroEquipo, setFiltroEquipo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; vacacion: Vacacion | null; personaId?: string; fecha?: string }>({
    open: false,
    vacacion: null,
  });

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
    Promise.all([
      equiposApi.listar(),
      personasApi.listar({ equipoId: filtroEquipo ?? undefined }),
      vacacionesApi.listar({
        equipoId: filtroEquipo ?? undefined,
        desde: claveDia(inicioMes),
        hasta: claveDia(finMes),
      }),
    ]).then(([eq, pe, va]) => {
      setEquipos(eq.data);
      setPersonas(pe.data);
      setVacaciones(va.data);
    }).finally(() => setLoading(false));
  };

  useEffect(cargar, [mes, filtroEquipo]);

  const vacacionEnDia = (personaId: string, dia: Date) => {
    const clave = claveDia(dia);
    return vacaciones.find((v) => v.personaId === personaId && clave >= v.fechaInicio && clave <= v.fechaFin);
  };

  const diasDelMes = (personaId: string) => dias.filter((d) => vacacionEnDia(personaId, d)).length;

  const abrirCelda = (persona: Persona, dia: Date) => {
    const existente = vacacionEnDia(persona.id, dia);
    if (existente) {
      setModal({ open: true, vacacion: existente });
    } else {
      setModal({ open: true, vacacion: null, personaId: persona.id, fecha: claveDia(dia) });
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
          <Button onPress={() => setModal({ open: true, vacacion: null })}>
            <IconPlus />
            Nueva vacación
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
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
                    const fds = getDay(dia) === 0 || getDay(dia) === 6;
                    return (
                      <td
                        key={dia.toISOString()}
                        onClick={() => abrirCelda(persona, dia)}
                        title={vac ? `${persona.nombre}: ${vac.fechaInicio} → ${vac.fechaFin}${vac.comentario ? ` · ${vac.comentario}` : ""}` : undefined}
                        className={`h-9 cursor-pointer border-b border-border text-center transition-colors ${
                          vac ? "bg-warning-soft hover:bg-warning-soft-hover" : fds ? "bg-surface-secondary hover:bg-warning-soft/40" : "hover:bg-warning-soft/40"
                        } ${isToday(dia) ? "border-x border-x-accent" : ""}`}
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
        defaultPersonaId={modal.personaId}
        defaultFecha={modal.fecha}
        personas={personas}
        onSaved={cargar}
      />
    </div>
  );
}
