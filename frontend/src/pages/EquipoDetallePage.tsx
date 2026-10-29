import { Button, Card, Spinner } from "@heroui/react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { SelectField } from "../components/SelectField";
import { StatusChip } from "../components/StatusChip";
import { equiposApi, personasApi } from "../lib/api";
import { ESTADO_EQUIPO_LABEL, ESTADO_PERSONA_COLOR, ESTADO_PERSONA_LABEL, ESTADO_PROYECTO_COLOR, ESTADO_PROYECTO_LABEL, formatHoras } from "../lib/format";
import type { EquipoDetalle, Persona } from "../types";

export default function EquipoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [equipo, setEquipo] = useState<EquipoDetalle | null>(null);
  const [disponibles, setDisponibles] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoMiembro, setNuevoMiembro] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const cargar = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([equiposApi.obtener(id), personasApi.listar()])
      .then(([eq, personas]) => {
        setEquipo(eq.data);
        setDisponibles(personas.data.filter((p) => !p.equipos.some((e) => e.id === id)));
      })
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [id]);

  const handleAdd = async () => {
    if (!id || !nuevoMiembro) return;
    setAdding(true);
    try {
      await equiposApi.agregarMiembro(id, nuevoMiembro);
      setNuevoMiembro(null);
      cargar();
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (personaId: string) => {
    if (!id) return;
    await equiposApi.quitarMiembro(id, personaId);
    cargar();
  };

  if (loading || !equipo) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{equipo.nombre}</h1>
          <p className="text-sm text-muted">Líder técnico: {equipo.liderTecnicoNombre ?? "Sin asignar"}</p>
        </div>
        <StatusChip color={equipo.estado === "Activo" ? "success" : "default"} label={ESTADO_EQUIPO_LABEL[equipo.estado]} />
      </div>
      {equipo.descripcion ? <p className="text-sm text-muted">{equipo.descripcion}</p> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="gap-3">
          <Card.Header>
            <Card.Title>Miembros ({equipo.miembros.length})</Card.Title>
            <Card.Description>Añade o retira personas de este equipo.</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SelectField
                  label="Añadir persona"
                  options={disponibles.map((p) => ({
                    id: p.id,
                    label: p.equipos.length > 0 ? `${p.nombre} (${p.equipos.map((e) => e.nombre).join(", ")})` : p.nombre,
                  }))}
                  placeholder="Selecciona una persona"
                  value={nuevoMiembro}
                  onChange={setNuevoMiembro}
                />
              </div>
              <Button isDisabled={!nuevoMiembro} isPending={adding} onPress={handleAdd}>
                Añadir
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {equipo.miembros.length === 0 ? (
                <p className="text-sm text-muted">Este equipo todavía no tiene miembros.</p>
              ) : (
                equipo.miembros.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2.5">
                      <PersonaAvatar id={m.id} nombre={m.nombre} size="sm" />
                      <div>
                        <Link to={`/personas/${m.id}`} className="font-medium text-link hover:underline">
                          {m.nombre}
                        </Link>
                        <p className="text-xs text-muted">
                          {m.rol} · carga {formatHoras(m.cargaHoras)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip color={ESTADO_PERSONA_COLOR[m.estado]} label={ESTADO_PERSONA_LABEL[m.estado]} />
                      <Button size="sm" variant="ghost" onPress={() => handleRemove(m.id)}>
                        Quitar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card.Content>
        </Card>

        <Card className="gap-3">
          <Card.Header>
            <Card.Title>Proyectos del equipo</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2">
            {equipo.proyectos.length === 0 ? (
              <p className="text-sm text-muted">Sin proyectos asignados a este equipo.</p>
            ) : (
              equipo.proyectos.map((p) => (
                <Link
                  key={p.id}
                  to={`/proyectos/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {p.codigo} · {p.nombre}
                    </p>
                    <p className="text-xs text-muted">{p.clienteArea}</p>
                  </div>
                  <StatusChip color={ESTADO_PROYECTO_COLOR[p.estado]} label={ESTADO_PROYECTO_LABEL[p.estado]} />
                </Link>
              ))
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
