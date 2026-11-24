import { Button, Input, Label, TextField } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IconCalendar, IconDownload, IconPlus, IconTeam, IconUsers } from "../components/Icons";
import { ProyectoFormModal } from "../components/ProyectoFormModal";
import { SelectField } from "../components/SelectField";
import { StatusChip } from "../components/StatusChip";
import { PrioridadChip } from "../components/PrioridadChip";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { equiposApi, proyectosApi } from "../lib/api";
import {
  ESTADO_PROYECTO_COLOR,
  ESTADO_PROYECTO_LABEL,
  esProyectoInactivo,
  formatFecha,
  PRIORIDAD_LABEL,
  TARJETA_INACTIVA_CLASS,
} from "../lib/format";
import type { Equipo, EstadoProyecto, Prioridad, Proyecto } from "../types";

const ESTADOS: EstadoProyecto[] = ["Planificado", "EnCurso", "EnPausa", "Cerrado", "Cancelado"];
const PRIORIDADES: Prioridad[] = ["Baja", "Media", "Alta", "Critica"];

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [filtroEquipo, setFiltroEquipo] = useState<string | null>(null);
  const [filtroPrioridad, setFiltroPrioridad] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Proyecto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Proyecto | null>(null);

  const cargar = () => {
    setLoading(true);
    proyectosApi
      .listar({
        q: q || undefined,
        estado: filtroEstado ?? undefined,
        equipoId: filtroEquipo ?? undefined,
        prioridad: filtroPrioridad ?? undefined,
      })
      .then((r) => setProyectos(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    equiposApi.listar().then((r) => setEquipos(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filtroEstado, filtroEquipo, filtroPrioridad]);

  const equipoOptions = useMemo(() => equipos.map((e) => ({ id: e.id, label: e.nombre })), [equipos]);
  const openCreate = () => {
    setEditando(null);
    setModalOpen(true);
  };

  const openEdit = (p: Proyecto) => {
    setEditando(p);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await proyectosApi.eliminar(deleteTarget.id);
    setDeleteTarget(null);
    cargar();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Proyectos</h1>
          <p className="text-sm text-muted">Sistemas de información del Ministerio en curso.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onPress={() => window.open(proyectosApi.exportUrl())}>
            <IconDownload />
            Exportar CSV
          </Button>
          <Button onPress={openCreate}>
            <IconPlus />
            Nuevo proyecto
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <TextField value={q} onChange={setQ}>
            <Label>Buscar</Label>
            <Input placeholder="Nombre, código, sistema..." />
          </TextField>
        </div>
        <div className="w-48">
          <SelectField emptyOption="Todos" label="Estado" options={ESTADOS.map((e) => ({ id: e, label: ESTADO_PROYECTO_LABEL[e] }))} value={filtroEstado} onChange={setFiltroEstado} />
        </div>
        <div className="w-56">
          <SelectField emptyOption="Todos los equipos" label="Equipo" options={equipoOptions} value={filtroEquipo} onChange={setFiltroEquipo} />
        </div>
        <div className="w-44">
          <SelectField emptyOption="Todas" label="Prioridad" options={PRIORIDADES.map((p) => ({ id: p, label: PRIORIDAD_LABEL[p] }))} value={filtroPrioridad} onChange={setFiltroPrioridad} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-sm text-muted">Cargando...</p>
        ) : proyectos.length === 0 ? (
          <p className="text-sm text-muted">No se encontraron proyectos.</p>
        ) : (
          proyectos.map((p) => (
            <div
              key={p.id}
              className={`flex flex-col gap-2 rounded-xl border border-border p-4 ${esProyectoInactivo(p.estado) ? TARJETA_INACTIVA_CLASS : "bg-surface"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    to={`/proyectos/${p.id}`}
                    className={`font-semibold hover:underline ${esProyectoInactivo(p.estado) ? "text-muted" : "text-link"}`}
                  >
                    {p.codigo} · {p.nombre}
                  </Link>
                  <p className="text-xs text-muted">{p.sistemaInformacion}</p>
                </div>
                <PrioridadChip prioridad={p.prioridad} />
              </div>
              <p className="truncate text-sm text-muted">{p.clienteArea}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted">
                <span className="flex min-w-0 items-center gap-1.5">
                  <IconTeam width={14} height={14} className="shrink-0 opacity-60" />
                  <span className="truncate">{p.equipoNombre ?? "Sin equipo"}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  {p.responsableId ? (
                    <PersonaAvatar id={p.responsableId} nombre={p.responsableNombre ?? ""} size="sm" />
                  ) : (
                    <IconUsers width={14} height={14} className="shrink-0 opacity-60" />
                  )}
                  <span className="truncate">{p.responsableNombre ?? "Sin responsable"}</span>
                </span>
                <span className="col-span-2 flex items-center gap-1.5">
                  <IconCalendar width={14} height={14} className="shrink-0 opacity-60" />
                  {formatFecha(p.fechaInicio)} → {formatFecha(p.fechaFin)}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <StatusChip color={ESTADO_PROYECTO_COLOR[p.estado]} label={ESTADO_PROYECTO_LABEL[p.estado]} />
                {p.tareasVencidas > 0 ? <StatusChip color="danger" label={`${p.tareasVencidas} vencidas`} /> : null}
                {p.tareasBloqueadas > 0 ? <StatusChip color="danger" label={`${p.tareasBloqueadas} bloqueadas`} /> : null}
                {p.riesgosAltos > 0 ? <StatusChip color="warning" label={`${p.riesgosAltos} riesgos`} /> : null}
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onPress={() => openEdit(p)}>
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onPress={() => setDeleteTarget(p)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <ProyectoFormModal isOpen={modalOpen} onOpenChange={setModalOpen} proyecto={editando} onSaved={cargar} />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar proyecto"
        description={`¿Seguro que quieres eliminar "${deleteTarget?.nombre}"? Se eliminarán también sus tareas e hitos.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
