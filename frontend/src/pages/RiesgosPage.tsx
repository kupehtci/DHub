import { Button } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IconDownload, IconPlus } from "../components/Icons";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { RiesgoFormModal } from "../components/RiesgoFormModal";
import { SelectField } from "../components/SelectField";
import { StatusChip } from "../components/StatusChip";
import { TareaFormModal } from "../components/TareaFormModal";
import { personasApi, proyectosApi, riesgosApi, tareasApi } from "../lib/api";
import { ESTADO_RIESGO_COLOR, ESTADO_RIESGO_LABEL, formatFecha, IMPACTO_COLOR, IMPACTO_LABEL } from "../lib/format";
import type { EstadoRiesgo, ImpactoRiesgo, Persona, Proyecto, Riesgo, Tarea } from "../types";

const ESTADOS: EstadoRiesgo[] = ["Identificado", "EnMitigacion", "Mitigado", "Materializado", "Cerrado"];
const IMPACTOS: ImpactoRiesgo[] = ["Bajo", "Medio", "Alto", "Critico"];

export default function RiesgosPage() {
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroProyecto, setFiltroProyecto] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [filtroImpacto, setFiltroImpacto] = useState<string | null>(null);

  const [modal, setModal] = useState<{ open: boolean; riesgo: Riesgo | null }>({ open: false, riesgo: null });
  const [deleteTarget, setDeleteTarget] = useState<Riesgo | null>(null);
  const [tareaModal, setTareaModal] = useState<Tarea | null>(null);

  const cargar = () => {
    setLoading(true);
    riesgosApi
      .listar({ proyectoId: filtroProyecto ?? undefined, estado: filtroEstado ?? undefined, impacto: filtroImpacto ?? undefined })
      .then((r) => setRiesgos(r.data))
      .finally(() => setLoading(false));
  };

  const cargarTareas = () => {
    tareasApi.listar().then((r) => setTareas(r.data));
  };

  useEffect(() => {
    proyectosApi.listar().then((r) => setProyectos(r.data));
    personasApi.listar().then((r) => setPersonas(r.data));
    cargarTareas();
  }, []);

  useEffect(cargar, [filtroProyecto, filtroEstado, filtroImpacto]);

  const proyectoOptions = useMemo(() => proyectos.map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` })), [proyectos]);
  const tareasBloqueadas = useMemo(
    () => tareas.filter((t) => t.estado === "Bloqueada" && (!filtroProyecto || t.proyectoId === filtroProyecto)),
    [tareas, filtroProyecto],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await riesgosApi.eliminar(deleteTarget.id);
    setDeleteTarget(null);
    cargar();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Riesgos y bloqueos</h1>
          <p className="text-sm text-muted">Impacto, responsable, estado y fecha de revisión.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onPress={() => window.open(riesgosApi.exportUrl())}>
            <IconDownload />
            Exportar CSV
          </Button>
          <Button onPress={() => setModal({ open: true, riesgo: null })}>
            <IconPlus />
            Nuevo riesgo
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <SelectField emptyOption="Todos los proyectos" label="Proyecto" options={proyectoOptions} value={filtroProyecto} onChange={setFiltroProyecto} />
        </div>
        <div className="w-48">
          <SelectField emptyOption="Todos" label="Estado" options={ESTADOS.map((e) => ({ id: e, label: ESTADO_RIESGO_LABEL[e] }))} value={filtroEstado} onChange={setFiltroEstado} />
        </div>
        <div className="w-44">
          <SelectField emptyOption="Todos" label="Impacto" options={IMPACTOS.map((i) => ({ id: i, label: IMPACTO_LABEL[i] }))} value={filtroImpacto} onChange={setFiltroImpacto} />
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-foreground">Tareas bloqueadas</p>
        {tareasBloqueadas.length === 0 ? (
          <p className="text-sm text-muted">No hay tareas bloqueadas para este filtro.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {tareasBloqueadas.map((t) => (
              <button
                key={t.id}
                onClick={() => setTareaModal(t)}
                className="flex flex-col gap-1 rounded-lg border border-danger/30 bg-danger-soft/30 px-3 py-2 text-left text-sm hover:bg-danger-soft/50"
              >
                <p className="truncate font-medium text-foreground">{t.titulo}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  {t.proyectoCodigo} ·
                  {t.responsableId ? <PersonaAvatar id={t.responsableId} nombre={t.responsableNombre ?? ""} size="sm" /> : null}
                  {t.responsableNombre ?? "Sin responsable"} · revisión {formatFecha(t.fechaRevisionBloqueo)}
                </p>
                {t.motivoBloqueo ? <p className="truncate text-xs text-danger">Motivo: {t.motivoBloqueo}</p> : null}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Proyecto / Tarea</th>
              <th className="px-4 py-3 font-medium">Impacto</th>
              <th className="px-4 py-3 font-medium">Probabilidad</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Revisión</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={8}>
                  Cargando...
                </td>
              </tr>
            ) : riesgos.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={8}>
                  No hay riesgos para este filtro.
                </td>
              </tr>
            ) : (
              riesgos.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-secondary">
                  <td className="px-4 py-3 font-medium">{r.titulo}</td>
                  <td className="px-4 py-3 text-muted">
                    {r.proyectoNombre ?? "—"}
                    {r.tareaTitulo ? ` · ${r.tareaTitulo}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip color={IMPACTO_COLOR[r.impacto]} label={IMPACTO_LABEL[r.impacto]} />
                  </td>
                  <td className="px-4 py-3">{r.probabilidad}</td>
                  <td className="px-4 py-3">
                    {r.responsableId ? (
                      <span className="flex items-center gap-1.5">
                        <PersonaAvatar id={r.responsableId} nombre={r.responsableNombre ?? ""} size="sm" />
                        {r.responsableNombre}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{formatFecha(r.fechaRevision)}</td>
                  <td className="px-4 py-3">
                    <StatusChip color={ESTADO_RIESGO_COLOR[r.estado]} label={ESTADO_RIESGO_LABEL[r.estado]} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onPress={() => setModal({ open: true, riesgo: r })}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onPress={() => setDeleteTarget(r)}>
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RiesgoFormModal
        isOpen={modal.open}
        onOpenChange={(open) => setModal((s) => ({ ...s, open }))}
        riesgo={modal.riesgo}
        proyectos={proyectos}
        personas={personas}
        tareas={tareas}
        onSaved={cargar}
      />

      <TareaFormModal
        isOpen={!!tareaModal}
        onOpenChange={(open) => !open && setTareaModal(null)}
        tarea={tareaModal}
        proyectos={proyectos}
        personas={personas}
        onSaved={cargarTareas}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar riesgo"
        description={`¿Seguro que quieres eliminar "${deleteTarget?.titulo}"?`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
