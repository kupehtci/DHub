import { Checkbox, Spinner } from "@heroui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { colorForId, initialsFor } from "../components/PersonaAvatar";
import { SelectField } from "../components/SelectField";
import { TareaFormModal } from "../components/TareaFormModal";
import { equiposApi, personasApi, proyectosApi, tareasApi } from "../lib/api";
import { CHART_COLORS, CHIP_COLOR_TO_CHART, ESTADO_TAREA_COLOR, PRIORIDAD_CHART_COLOR } from "../lib/format";
import type { Equipo, Persona, Proyecto, Tarea } from "../types";

const WIDTH = 1600;
const HEIGHT = 1000;
const NODE_W = 168;
const NODE_H = 64;

type Posiciones = Record<string, { x: number; y: number }>;

// Simulación de fuerzas muy simple (repulsión entre nodos, muelle en las aristas,
// fuerza de centrado): suficiente para dar un acomodo inicial razonable, al estilo
// del grafo de Obsidian, sin depender de ninguna librería externa.
function calcularLayout(ids: string[], aristas: [string, string][]): Posiciones {
  const pos: Posiciones = {};
  const vel: Record<string, { x: number; y: number }> = {};
  ids.forEach((id, i) => {
    const angulo = (i / Math.max(1, ids.length)) * Math.PI * 2;
    const radio = 180 + (i % 5) * 40;
    pos[id] = { x: WIDTH / 2 + Math.cos(angulo) * radio, y: HEIGHT / 2 + Math.sin(angulo) * radio };
    vel[id] = { x: 0, y: 0 };
  });

  const REPULSION = 26000;
  const LONGITUD_MUELLE = 220;
  const K_MUELLE = 0.02;
  const K_CENTRO = 0.006;
  const AMORTIGUACION = 0.82;

  for (let iter = 0; iter < 260; iter++) {
    const fuerza: Record<string, { x: number; y: number }> = {};
    ids.forEach((id) => (fuerza[id] = { x: 0, y: 0 }));

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i];
        const b = ids[j];
        const dx = pos[a].x - pos[b].x;
        const dy = pos[a].y - pos[b].y;
        const distSq = Math.max(dx * dx + dy * dy, 1);
        const dist = Math.sqrt(distSq);
        const f = REPULSION / distSq;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        fuerza[a].x += fx;
        fuerza[a].y += fy;
        fuerza[b].x -= fx;
        fuerza[b].y -= fy;
      }
    }

    aristas.forEach(([a, b]) => {
      if (!pos[a] || !pos[b]) return;
      const dx = pos[b].x - pos[a].x;
      const dy = pos[b].y - pos[a].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const f = (dist - LONGITUD_MUELLE) * K_MUELLE;
      const fx = (dx / dist) * f;
      const fy = (dy / dist) * f;
      fuerza[a].x += fx;
      fuerza[a].y += fy;
      fuerza[b].x -= fx;
      fuerza[b].y -= fy;
    });

    ids.forEach((id) => {
      fuerza[id].x += (WIDTH / 2 - pos[id].x) * K_CENTRO;
      fuerza[id].y += (HEIGHT / 2 - pos[id].y) * K_CENTRO;
      vel[id].x = (vel[id].x + fuerza[id].x) * AMORTIGUACION;
      vel[id].y = (vel[id].y + fuerza[id].y) * AMORTIGUACION;
      pos[id].x += vel[id].x;
      pos[id].y += vel[id].y;
    });
  }

  return pos;
}

export default function TareasMapaPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroEquipo, setFiltroEquipo] = useState<string | null>(null);
  const [filtroProyecto, setFiltroProyecto] = useState<string | null>(null);
  const [soloConRelacion, setSoloConRelacion] = useState(false);

  const [posiciones, setPosiciones] = useState<Posiciones>({});
  const [editTarea, setEditTarea] = useState<Tarea | null>(null);

  const drag = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  const cargar = () => {
    setLoading(true);
    tareasApi
      .listar({ equipoId: filtroEquipo ?? undefined, proyectoId: filtroProyecto ?? undefined })
      .then((r) => setTareas(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    proyectosApi.listar().then((r) => setProyectos(r.data));
    equiposApi.listar().then((r) => setEquipos(r.data));
    personasApi.listar().then((r) => setPersonas(r.data));
  }, []);

  useEffect(cargar, [filtroEquipo, filtroProyecto]);

  const nodos = useMemo(
    () => (soloConRelacion ? tareas.filter((t) => t.relacionadas.length > 0) : tareas),
    [tareas, soloConRelacion],
  );

  const aristas = useMemo(() => {
    const ids = new Set(nodos.map((t) => t.id));
    const vistas = new Set<string>();
    const lista: [string, string][] = [];
    nodos.forEach((t) => {
      t.relacionadas.forEach((r) => {
        if (!ids.has(r.id)) return;
        const clave = [t.id, r.id].sort().join("|");
        if (vistas.has(clave)) return;
        vistas.add(clave);
        lista.push([t.id, r.id]);
      });
    });
    return lista;
  }, [nodos]);

  // Calcula posiciones iniciales solo para los nodos nuevos que todavía no tengan una;
  // así no se reordena el grafo entero cada vez que se recarga tras editar una tarea.
  useEffect(() => {
    const idsActuales = nodos.map((t) => t.id);
    const faltan = idsActuales.filter((id) => !posiciones[id]);
    if (faltan.length === 0) return;

    if (Object.keys(posiciones).length === 0) {
      setPosiciones(calcularLayout(idsActuales, aristas));
      return;
    }

    setPosiciones((prev) => {
      const next = { ...prev };
      faltan.forEach((id, i) => {
        next[id] = { x: WIDTH / 2 + ((i % 5) - 2) * 60, y: HEIGHT / 2 + Math.floor(i / 5) * 60 };
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodos]);

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    const p = posiciones[id];
    if (!p) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { id, startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent, escala: number) => {
    // Se captura drag.current en una variable local: el callback de setPosiciones puede
    // ejecutarse más tarde (al aplicar el estado), y para entonces un pointerup ya
    // procesado en el mismo lote de eventos podría haber puesto drag.current a null.
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / escala;
    const dy = (e.clientY - d.startY) / escala;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    const nuevaPos = { x: d.origX + dx, y: d.origY + dy };
    setPosiciones((prev) => ({ ...prev, [d.id]: nuevaPos }));
  };

  const handlePointerUp = (id: string) => {
    if (drag.current && drag.current.id === id && !drag.current.moved) {
      const tarea = tareas.find((t) => t.id === id);
      if (tarea) setEditTarea(tarea);
    }
    drag.current = null;
  };

  const svgRef = useRef<SVGSVGElement>(null);
  const getEscala = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect ? rect.width / WIDTH : 1;
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mapa de tareas</h1>
          <p className="text-sm text-muted">Arrastra las tarjetas para moverlas; haz clic para editar la tarea. Las líneas unen tareas relacionadas.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <SelectField emptyOption="Todos los equipos" label="Equipo" options={equipos.map((e) => ({ id: e.id, label: e.nombre }))} value={filtroEquipo} onChange={setFiltroEquipo} />
          </div>
          <div className="w-56">
            <SelectField
              emptyOption="Todos los proyectos"
              label="Proyecto"
              options={proyectos.map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` }))}
              value={filtroProyecto}
              onChange={setFiltroProyecto}
            />
          </div>
          <Checkbox isSelected={soloConRelacion} onChange={setSoloConRelacion}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Solo tareas con relación
            </Checkbox.Content>
          </Checkbox>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : nodos.length === 0 ? (
        <p className="text-sm text-muted">No hay tareas para este filtro.</p>
      ) : (
        <div className="flex-1 overflow-hidden rounded-xl border border-border bg-surface">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-full w-full touch-none select-none"
            onPointerMove={(e) => handlePointerMove(e, getEscala())}
          >
            <g>
              {aristas.map(([a, b]) => {
                const pa = posiciones[a];
                const pb = posiciones[b];
                if (!pa || !pb) return null;
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke="var(--border)"
                    strokeWidth={2}
                  />
                );
              })}
            </g>
            {nodos.map((t) => {
              const p = posiciones[t.id];
              if (!p) return null;
              return (
                <foreignObject
                  key={t.id}
                  x={p.x - NODE_W / 2}
                  y={p.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  style={{ overflow: "visible" }}
                >
                  <div
                    onPointerDown={(e) => handlePointerDown(e, t.id)}
                    onPointerUp={() => handlePointerUp(t.id)}
                    style={{ borderLeftColor: PRIORIDAD_CHART_COLOR[t.prioridad] }}
                    className="flex h-full w-full cursor-grab flex-col justify-center gap-1 rounded-lg border border-border border-l-4 bg-surface px-2.5 py-1.5 shadow-sm active:cursor-grabbing"
                  >
                    <p className="truncate text-xs font-medium leading-tight text-foreground">{t.titulo}</p>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[10px] text-muted">{t.proyectoCodigo}</span>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: CHIP_COLOR_TO_CHART[ESTADO_TAREA_COLOR[t.estado]] ?? CHART_COLORS.muted }}
                        title={t.estado}
                      />
                    </div>
                    {t.responsableId ? (
                      <div className="flex items-center gap-1">
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold text-white"
                          style={{ backgroundColor: colorForId(t.responsableId) }}
                        >
                          {initialsFor(t.responsableNombre ?? "")}
                        </span>
                        <span className="truncate text-[10px] text-muted">{t.responsableNombre}</span>
                      </div>
                    ) : null}
                  </div>
                </foreignObject>
              );
            })}
          </svg>
        </div>
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
