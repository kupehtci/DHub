import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Button, Spinner } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { DraggableCard, DroppableColumn } from "../components/kanban/DndPrimitives";
import { TareaCard } from "../components/kanban/TareaCard";
import { IconDownload } from "../components/Icons";
import { SelectField } from "../components/SelectField";
import { TareaFormModal } from "../components/TareaFormModal";
import { equiposApi, personasApi, proyectosApi, tareasApi } from "../lib/api";
import { ESTADO_TAREA_LABEL } from "../lib/format";
import { ESTADOS_TAREA, type EstadoTarea, type Equipo, type Persona, type Proyecto, type Tarea } from "../types";

export default function TableroEquipoPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoId, setEquipoId] = useState<string | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [editTarea, setEditTarea] = useState<Tarea | null>(null);
  const [bloqueoDraft, setBloqueoDraft] = useState<Tarea | null>(null);
  const [hechaDraft, setHechaDraft] = useState<Tarea | null>(null);

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
    tareasApi
      .listar({ equipoId })
      .then((r) => setTareas(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [equipoId]);

  const columnas = useMemo(() => {
    const map = new Map<EstadoTarea, Tarea[]>(ESTADOS_TAREA.map((e) => [e, []]));
    tareas.forEach((t) => map.get(t.estado)?.push(t));
    return map;
  }, [tareas]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const tareaId = String(active.id);
    const nuevoEstado = String(over.id) as EstadoTarea;
    const tarea = tareas.find((t) => t.id === tareaId);
    if (!tarea || tarea.estado === nuevoEstado) return;

    if (nuevoEstado === "Bloqueada") {
      setBloqueoDraft({ ...tarea, estado: "Bloqueada" });
      return;
    }
    if (nuevoEstado === "Hecha") {
      setHechaDraft({ ...tarea, estado: "Hecha" });
      return;
    }

    setTareas((prev) => prev.map((t) => (t.id === tareaId ? { ...t, estado: nuevoEstado } : t)));
    try {
      await tareasApi.cambiarEstado(tareaId, nuevoEstado);
    } finally {
      cargar();
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tablero por equipo</h1>
          <p className="text-sm text-muted">Arrastra las tarjetas entre columnas para cambiar el estado.</p>
        </div>
        <div className="flex items-end gap-3">
          <div className="w-64">
            <SelectField label="Equipo" options={equipos.map((e) => ({ id: e.id, label: e.nombre }))} value={equipoId} onChange={setEquipoId} />
          </div>
          <Button isDisabled={!equipoId} variant="secondary" onPress={() => equipoId && window.open(tareasApi.exportUrl({ equipoId }))}>
            <IconDownload />
            Exportar CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {ESTADOS_TAREA.map((estado) => (
              <DroppableColumn key={estado} id={estado}>
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-sm font-semibold text-foreground">{ESTADO_TAREA_LABEL[estado]}</span>
                  <span className="text-xs text-muted">{columnas.get(estado)?.length ?? 0}</span>
                </div>
                {(columnas.get(estado) ?? []).map((t) => (
                  <DraggableCard key={t.id} id={t.id} columnId={estado}>
                    <TareaCard tarea={t} onClick={() => setEditTarea(t)} />
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
      <TareaFormModal
        isOpen={!!bloqueoDraft}
        onOpenChange={(open) => !open && setBloqueoDraft(null)}
        tarea={bloqueoDraft}
        proyectos={proyectos}
        personas={personas}
        onSaved={cargar}
      />
      <TareaFormModal
        isOpen={!!hechaDraft}
        onOpenChange={(open) => !open && setHechaDraft(null)}
        tarea={hechaDraft}
        proyectos={proyectos}
        personas={personas}
        onSaved={cargar}
      />
    </div>
  );
}
