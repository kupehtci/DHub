import { Button, Input, Label, TextField } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IconDownload, IconPlus } from "../components/Icons";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { PrioridadChip } from "../components/PrioridadChip";
import { SelectField } from "../components/SelectField";
import { StatusChip } from "../components/StatusChip";
import { TareaFormModal } from "../components/TareaFormModal";
import { equiposApi, personasApi, proyectosApi, tareasApi } from "../lib/api";
import { ESTADO_TAREA_LABEL, formatFecha } from "../lib/format";
import { ESTADOS_TAREA, type Equipo, type Persona, type Prioridad, type Proyecto, type Tarea } from "../types";

const PRIORIDADES: Prioridad[] = ["Baja", "Media", "Alta", "Critica"];

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState<string | null>(null);
  const [filtroEquipo, setFiltroEquipo] = useState<string | null>(null);
  const [filtroResponsable, setFiltroResponsable] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [filtroPrioridad, setFiltroPrioridad] = useState<string | null>(null);

  const [modal, setModal] = useState<{ open: boolean; tarea: Tarea | null }>({ open: false, tarea: null });
  const [deleteTarget, setDeleteTarget] = useState<Tarea | null>(null);

  const filtros = {
    q: q || undefined,
    proyectoId: filtroProyecto ?? undefined,
    equipoId: filtroEquipo ?? undefined,
    responsableId: filtroResponsable ?? undefined,
    estado: filtroEstado ?? undefined,
    prioridad: filtroPrioridad ?? undefined,
  };

  const cargar = () => {
    setLoading(true);
    tareasApi
      .listar(filtros)
      .then((r) => setTareas(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    proyectosApi.listar().then((r) => setProyectos(r.data));
    equiposApi.listar().then((r) => setEquipos(r.data));
    personasApi.listar().then((r) => setPersonas(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filtroProyecto, filtroEquipo, filtroResponsable, filtroEstado, filtroPrioridad]);

  const proyectoOptions = useMemo(() => proyectos.map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` })), [proyectos]);
  const equipoOptions = useMemo(() => equipos.map((e) => ({ id: e.id, label: e.nombre })), [equipos]);
  const personaOptions = useMemo(() => personas.map((p) => ({ id: p.id, label: p.nombre })), [personas]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await tareasApi.eliminar(deleteTarget.id);
    setDeleteTarget(null);
    cargar();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tareas</h1>
          <p className="text-sm text-muted">Todas las tareas de todos los proyectos, con su persona asignada.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onPress={() => window.open(tareasApi.exportUrl(filtros))}>
            <IconDownload />
            Exportar CSV
          </Button>
          <Button onPress={() => setModal({ open: true, tarea: null })}>
            <IconPlus />
            Nueva tarea
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <TextField value={q} onChange={setQ}>
            <Label>Buscar</Label>
            <Input placeholder="Título de la tarea..." />
          </TextField>
        </div>
        <div className="w-56">
          <SelectField emptyOption="Todos los proyectos" label="Proyecto" options={proyectoOptions} value={filtroProyecto} onChange={setFiltroProyecto} />
        </div>
        <div className="w-48">
          <SelectField emptyOption="Todos los equipos" label="Equipo" options={equipoOptions} value={filtroEquipo} onChange={setFiltroEquipo} />
        </div>
        <div className="w-48">
          <SelectField emptyOption="Todas las personas" label="Responsable" options={personaOptions} value={filtroResponsable} onChange={setFiltroResponsable} />
        </div>
        <div className="w-44">
          <SelectField emptyOption="Todos" label="Estado" options={ESTADOS_TAREA.map((e) => ({ id: e, label: ESTADO_TAREA_LABEL[e] }))} value={filtroEstado} onChange={setFiltroEstado} />
        </div>
        <div className="w-40">
          <SelectField emptyOption="Todas" label="Prioridad" options={PRIORIDADES.map((p) => ({ id: p, label: p }))} value={filtroPrioridad} onChange={setFiltroPrioridad} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Proyecto</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Prioridad</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Objetivo</th>
              <th className="px-4 py-3 font-medium">Relacionadas</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={9}>
                  Cargando...
                </td>
              </tr>
            ) : tareas.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={9}>
                  No hay tareas para este filtro.
                </td>
              </tr>
            ) : (
              tareas.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setModal({ open: true, tarea: t })}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-secondary"
                >
                  <td className="px-4 py-3">
                    <p className="max-w-[260px] truncate font-medium text-foreground">{t.titulo}</p>
                    {t.jiraTicketClave ? <p className="text-xs text-muted">{t.jiraTicketClave}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-muted">{t.proyectoCodigo}</td>
                  <td className="px-4 py-3">
                    {t.responsableId ? (
                      <span className="flex items-center gap-1.5">
                        <PersonaAvatar id={t.responsableId} nombre={t.responsableNombre ?? ""} size="sm" />
                        {t.responsableNombre}
                      </span>
                    ) : (
                      <span className="text-muted">Sin responsable</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{t.tipo}</td>
                  <td className="px-4 py-3">
                    <PrioridadChip prioridad={t.prioridad} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <StatusChip color={t.estado === "Bloqueada" ? "danger" : t.estado === "Hecha" ? "success" : "default"} label={ESTADO_TAREA_LABEL[t.estado]} />
                      {t.estaVencida ? <StatusChip color="danger" label="Vencida" /> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatFecha(t.fechaObjetivo)}</td>
                  <td className="px-4 py-3">
                    {t.relacionadas.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className="text-xs text-muted" title={t.relacionadas.map((r) => r.titulo).join(", ")}>
                        {t.relacionadas.length} tarea{t.relacionadas.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onPress={() => setDeleteTarget(t)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TareaFormModal
        isOpen={modal.open}
        onOpenChange={(open) => setModal((s) => ({ ...s, open }))}
        tarea={modal.tarea}
        proyectos={proyectos}
        personas={personas}
        onSaved={cargar}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar tarea"
        description={`¿Seguro que quieres eliminar "${deleteTarget?.titulo}"?`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
