import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Spinner } from "@heroui/react";
import { useEffect, useState } from "react";
import { DraggableCard, DroppableColumn } from "../components/kanban/DndPrimitives";
import { TareaCard } from "../components/kanban/TareaCard";
import { SelectField } from "../components/SelectField";
import { TareaFormModal } from "../components/TareaFormModal";
import { equiposApi, personasApi, proyectosApi, tareasApi } from "../lib/api";
import { formatHoras } from "../lib/format";
import type { Equipo, Persona, Proyecto, TableroPorPersona, Tarea } from "../types";

const SIN_RESPONSABLE = "sin-responsable";

export default function TableroUsuariosPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoId, setEquipoId] = useState<string | null>(null);
  const [columnas, setColumnas] = useState<TableroPorPersona[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [editTarea, setEditTarea] = useState<Tarea | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    equiposApi.listar().then((r) => {
      setEquipos(r.data);
      if (r.data.length > 0) setEquipoId(r.data[0].id);
    });
    proyectosApi.listar().then((r) => setProyectos(r.data));
    personasApi.listar().then((r) => setPersonas(r.data));
  }, []);

  const cargar = () => {
    if (!equipoId) return;
    setLoading(true);
    equiposApi
      .tableroPorUsuario(equipoId)
      .then((r) => setColumnas(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [equipoId]);

  const columnId = (p: TableroPorPersona) => p.personaId ?? SIN_RESPONSABLE;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const tareaId = String(active.id);
    const destino = String(over.id);
    const origen = String(active.data.current?.columnId ?? "");
    if (destino === origen) return;

    const tarea = columnas.flatMap((c) => c.tareas).find((t) => t.id === tareaId);
    if (!tarea) return;

    const nuevoResponsableId = destino === SIN_RESPONSABLE ? null : destino;

    setColumnas((prev) =>
      prev.map((c) => ({
        ...c,
        tareas:
          columnId(c) === origen
            ? c.tareas.filter((t) => t.id !== tareaId)
            : columnId(c) === destino
              ? [...c.tareas, { ...tarea, responsableId: nuevoResponsableId }]
              : c.tareas,
      })),
    );

    await tareasApi.actualizar(tareaId, {
      titulo: tarea.titulo,
      descripcion: tarea.descripcion,
      tipo: tarea.tipo,
      estado: tarea.estado,
      prioridad: tarea.prioridad,
      proyectoId: tarea.proyectoId,
      responsableId: nuevoResponsableId,
      estimacionHoras: tarea.estimacionHoras,
      fechaInicio: tarea.fechaInicio,
      fechaObjetivo: tarea.fechaObjetivo,
      fechaCierre: tarea.fechaCierre,
      motivoBloqueo: tarea.motivoBloqueo,
      responsableBloqueoId: tarea.responsableBloqueoId,
      fechaRevisionBloqueo: tarea.fechaRevisionBloqueo,
      jiraTicketClave: tarea.jiraTicketClave,
      jiraTicketUrl: tarea.jiraTicketUrl,
    });
    cargar();
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tablero por usuario</h1>
          <p className="text-sm text-muted">Cada columna es una persona del equipo. Arrastra para reasignar tareas.</p>
        </div>
        <div className="w-64">
          <SelectField label="Equipo" options={equipos.map((e) => ({ id: e.id, label: e.nombre }))} value={equipoId} onChange={setEquipoId} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {columnas.map((col) => (
              <DroppableColumn key={columnId(col)} id={columnId(col)}>
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-sm font-semibold text-foreground">{col.personaNombre}</span>
                  <span className="text-xs text-muted">{formatHoras(col.cargaHoras)}</span>
                </div>
                {col.tareas.length === 0 ? <p className="px-1 text-xs text-muted">Sin tareas</p> : null}
                {col.tareas.map((t) => (
                  <DraggableCard key={t.id} id={t.id} columnId={columnId(col)}>
                    <TareaCard tarea={t} onClick={() => setEditTarea(t)} subtitle={t.proyectoCodigo} />
                  </DraggableCard>
                ))}
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      )}

      <TareaFormModal
        isOpen={!!editTarea}
        onOpenChange={(open) => !open && setEditTarea(null)}
        tarea={editTarea}
        proyectos={proyectos}
        personas={personas}
        onSaved={cargar}
      />
    </div>
  );
}
