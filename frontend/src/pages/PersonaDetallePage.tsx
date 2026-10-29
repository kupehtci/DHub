import { Button, Card, Label, TextArea, TextField } from "@heroui/react";
import { Spinner } from "@heroui/react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { StatCard } from "../components/StatCard";
import { StatusChip } from "../components/StatusChip";
import { notasApi, personasApi } from "../lib/api";
import {
  ESTADO_PERSONA_COLOR,
  ESTADO_PERSONA_LABEL,
  ESTADO_TAREA_COLOR,
  ESTADO_TAREA_LABEL,
  formatFecha,
  formatHoras,
  PRIORIDAD_COLOR,
  PRIORIDAD_LABEL,
  TIPO_NOTA_LABEL,
} from "../lib/format";
import type { Nota, PersonaDetalle, Tarea } from "../types";

function TareaRow({ t }: { t: Tarea }) {
  return (
    <Link
      to={`/proyectos/${t.proyectoId}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{t.titulo}</p>
        <p className="text-xs text-muted">
          {t.proyectoCodigo} · {formatHoras(t.estimacionHoras)} · objetivo {formatFecha(t.fechaObjetivo)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusChip color={PRIORIDAD_COLOR[t.prioridad]} label={PRIORIDAD_LABEL[t.prioridad]} />
        <StatusChip color={ESTADO_TAREA_COLOR[t.estado]} label={ESTADO_TAREA_LABEL[t.estado]} />
      </div>
    </Link>
  );
}

function TareaList({ titulo, tareas, vacio }: { titulo: string; tareas: Tarea[]; vacio: string }) {
  return (
    <Card className="gap-3">
      <Card.Header>
        <Card.Title>
          {titulo} ({tareas.length})
        </Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col gap-2">
        {tareas.length === 0 ? <p className="text-sm text-muted">{vacio}</p> : tareas.map((t) => <TareaRow key={t.id} t={t} />)}
      </Card.Content>
    </Card>
  );
}

export default function PersonaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [persona, setPersona] = useState<PersonaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [notaTexto, setNotaTexto] = useState("");

  const cargarNotas = () => {
    if (!id) return;
    notasApi.listar({ personaId: id }).then((r) => setNotas(r.data));
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    personasApi
      .obtener(id)
      .then((r) => setPersona(r.data))
      .finally(() => setLoading(false));
    cargarNotas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCrearNota = async () => {
    if (!id || !notaTexto.trim()) return;
    await notasApi.crear({ autorId: id, tipo: "General", texto: notaTexto, personaId: id });
    setNotaTexto("");
    cargarNotas();
  };

  const handleEliminarNota = async (notaId: string) => {
    await notasApi.eliminar(notaId);
    cargarNotas();
  };

  if (loading || !persona) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PersonaAvatar id={persona.id} nombre={persona.nombre} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold">{persona.nombre}</h1>
            <p className="text-sm text-muted">
              {persona.rol} · {persona.email}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {persona.equipos.length === 0 ? (
                <span className="text-xs text-muted">Sin equipo asignado</span>
              ) : (
                persona.equipos.map((e) => <StatusChip key={e.id} color="default" label={e.nombre} />)
              )}
            </div>
          </div>
        </div>
        <StatusChip color={ESTADO_PERSONA_COLOR[persona.estado]} label={ESTADO_PERSONA_LABEL[persona.estado]} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Carga activa" value={formatHoras(persona.cargaHoras)} tone="accent" />
        <StatCard label="Disponibilidad semanal" value={formatHoras(persona.disponibilidadSemanalHoras)} />
        <StatCard label="Tareas bloqueadas" value={persona.tareasBloqueadas.length} tone="danger" />
        <StatCard label="Próximas entregas" value={persona.proximasEntregas.length} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TareaList titulo="Tareas activas" tareas={persona.tareasActivas} vacio="Sin tareas activas." />
        <TareaList titulo="Bloqueadas" tareas={persona.tareasBloqueadas} vacio="Sin tareas bloqueadas." />
        <TareaList titulo="Pendientes (backlog / planificadas)" tareas={persona.tareasPendientes} vacio="Sin tareas pendientes." />
        <TareaList titulo="Próximas entregas" tareas={persona.proximasEntregas} vacio="Sin entregas próximas." />
      </div>

      <Card className="gap-3">
        <Card.Header>
          <Card.Title>Notas de seguimiento ({notas.length})</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-secondary/40 p-3">
            <TextField value={notaTexto} onChange={setNotaTexto}>
              <Label>Nueva nota</Label>
              <TextArea placeholder="Observaciones sobre esta persona..." rows={2} />
            </TextField>
            <div className="flex justify-end">
              <Button isDisabled={!notaTexto.trim()} onPress={handleCrearNota}>
                Añadir nota
              </Button>
            </div>
          </div>
          {notas.length === 0 ? (
            <p className="text-sm text-muted">Sin notas registradas.</p>
          ) : (
            notas.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <p className="text-xs text-muted">
                    {TIPO_NOTA_LABEL[n.tipo]} · {new Date(n.fecha).toLocaleString("es-ES")}
                    {n.proyectoNombre ? ` · ${n.proyectoNombre}` : ""}
                  </p>
                  <p>{n.texto}</p>
                </div>
                <Button size="sm" variant="ghost" onPress={() => handleEliminarNota(n.id)}>
                  Eliminar
                </Button>
              </div>
            ))
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
