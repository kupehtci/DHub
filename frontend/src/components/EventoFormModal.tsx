import { Button, Input, Label, TextArea, TextField } from "@heroui/react";
import { useEffect, useState } from "react";
import { eventosApi, proyectosApi } from "../lib/api";
import { ESTADO_HITO_LABEL, TIPO_EVENTO_LABEL } from "../lib/format";
import type { Equipo, EstadoHito, Evento, Persona, Proyecto, TipoEvento } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { DatePickerField } from "./DatePickerField";
import { EventoFechasField } from "./EventoFechasField";
import { FormModal } from "./FormModal";
import { MarkdownEditor } from "./MarkdownEditor";
import { SearchableSelect } from "./SearchableSelect";
import { SegmentedControl } from "./SegmentedControl";
import { SelectField } from "./SelectField";

// "Hito" no es un tipo de evento: esa pestaña crea un hito de proyecto (con estado y seguimiento).
type Modo = TipoEvento | "Hito";
const MODOS: { id: Modo; label: string }[] = [
  { id: "Reunion", label: TIPO_EVENTO_LABEL.Reunion },
  { id: "Entrega", label: TIPO_EVENTO_LABEL.Entrega },
  { id: "Hito", label: "Hito" },
  { id: "Otro", label: TIPO_EVENTO_LABEL.Otro },
];
const ESTADOS_HITO: EstadoHito[] = ["Pendiente", "EnRiesgo", "Retrasado", "Completado"];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

interface FormState {
  titulo: string;
  descripcion: string;
  tipo: Modo;
  estadoHito: EstadoHito;
  fechaInicio: string;
  fechaFin: string;
  proyectoId: string | null;
  equipoId: string | null;
  personaId: string | null;
}

function emptyForm(fechaInicio?: string): FormState {
  return {
    titulo: "",
    descripcion: "",
    tipo: "Reunion",
    estadoHito: "Pendiente",
    fechaInicio: fechaInicio ?? toLocalInput(new Date().toISOString()),
    fechaFin: "",
    proyectoId: null,
    equipoId: null,
    personaId: null,
  };
}

export function EventoFormModal({
  isOpen,
  onOpenChange,
  evento,
  defaultFechaInicio,
  proyectos,
  equipos,
  personas,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  evento: Evento | null;
  defaultFechaInicio?: string;
  proyectos: Pick<Proyecto, "id" | "codigo" | "nombre">[];
  equipos: Pick<Equipo, "id" | "nombre">[];
  personas: Persona[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm(defaultFechaInicio));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esHito = form.tipo === "Hito";

  useEffect(() => {
    if (!isOpen) return;
    if (evento) {
      setForm({
        titulo: evento.titulo,
        descripcion: evento.descripcion ?? "",
        tipo: evento.tipo,
        estadoHito: "Pendiente",
        fechaInicio: toLocalInput(evento.fechaInicio),
        fechaFin: toLocalInput(evento.fechaFin),
        proyectoId: evento.proyectoId,
        equipoId: evento.equipoId,
        personaId: evento.personaId,
      });
    } else {
      setForm(emptyForm(defaultFechaInicio));
    }
    setError(null);
  }, [isOpen, evento, defaultFechaInicio]);

  const guardarHito = async () => {
    if (!form.proyectoId) return setError("Un hito pertenece siempre a un proyecto: selecciona cuál.");
    if (!form.titulo.trim()) return setError("Indica el nombre del hito.");
    if (!form.fechaInicio) return setError("Indica la fecha del hito.");
    setSaving(true);
    try {
      await proyectosApi.crearHito(form.proyectoId, {
        proyectoId: form.proyectoId,
        nombre: form.titulo.trim(),
        fecha: form.fechaInicio.slice(0, 10),
        estado: form.estadoHito,
        descripcion: form.descripcion || null,
      });
      onOpenChange(false);
      onSaved();
    } catch {
      setError("No se ha podido crear el hito.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (esHito) return guardarHito();
    // El propio campo de fechas ya avisa del error; aquí solo se evita guardarlo.
    if (!form.fechaInicio || (form.fechaFin && form.fechaFin < form.fechaInicio)) return;
    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        tipo: form.tipo as TipoEvento,
        fechaInicio: fromLocalInput(form.fechaInicio)!,
        fechaFin: fromLocalInput(form.fechaFin),
        proyectoId: form.proyectoId,
        equipoId: form.equipoId,
        personaId: form.personaId,
      };
      if (evento) await eventosApi.actualizar(evento.id, payload);
      else await eventosApi.crear(payload);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!evento) return;
    setDeleting(true);
    try {
      await eventosApi.eliminar(evento.id);
      setConfirmDelete(false);
      onOpenChange(false);
      onSaved();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <FormModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="lg"
        dialogClassName="sm:max-w-3xl"
        title={evento ? "Editar evento" : esHito ? "Nuevo hito" : "Nuevo evento"}
        footer={
          <>
            {evento ? (
              <Button variant="danger-soft" onPress={() => setConfirmDelete(true)}>
                Eliminar
              </Button>
            ) : null}
            <Button slot="close" variant="secondary">
              Cancelar
            </Button>
            <Button isPending={saving} onPress={handleSave}>
              Guardar
            </Button>
          </>
        }
      >
        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
        <SegmentedControl
          ariaLabel="Tipo"
          // Un evento ya creado no puede convertirse en hito (son entidades distintas).
          options={evento ? MODOS.filter((m) => m.id !== "Hito") : MODOS}
          value={form.tipo}
          onChange={(tipo) => setForm((f) => ({ ...f, tipo }))}
        />
        {esHito ? (
          <>
            <p className="-mt-2 text-xs text-muted">Se crea como hito del proyecto: aparece en el calendario, en Tareas › Hitos y en el detalle del proyecto.</p>
            <SearchableSelect
              isRequired
              clearable={false}
              label="Proyecto"
              options={proyectos.map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` }))}
              value={form.proyectoId}
              onChange={(v) => setForm((f) => ({ ...f, proyectoId: v }))}
              placeholder="Busca por código o nombre…"
              emptyText="No hay proyectos que coincidan"
            />
            <TextField isRequired value={form.titulo} onChange={(v) => setForm((f) => ({ ...f, titulo: v }))}>
              <Label>Nombre del hito</Label>
              <Input placeholder="Entrega del módulo X" />
            </TextField>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DatePickerField
                isRequired
                label="Fecha"
                value={form.fechaInicio.slice(0, 10)}
                onChange={(v) => setForm((f) => ({ ...f, fechaInicio: v ? `${v}T${f.fechaInicio.slice(11, 16) || "09:00"}` : "" }))}
              />
              <SelectField
                label="Estado"
                options={ESTADOS_HITO.map((e) => ({ id: e, label: ESTADO_HITO_LABEL[e] }))}
                value={form.estadoHito}
                onChange={(v) => setForm((f) => ({ ...f, estadoHito: (v as EstadoHito) ?? "Pendiente" }))}
              />
            </div>
            <TextField value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}>
              <Label>Descripción</Label>
              <TextArea rows={3} />
            </TextField>
          </>
        ) : (
          <>
          <TextField isRequired value={form.titulo} onChange={(v) => setForm((f) => ({ ...f, titulo: v }))}>
            <Label>Título</Label>
            <Input placeholder="Comité de seguimiento..." />
          </TextField>
          <EventoFechasField
            inicio={form.fechaInicio}
            fin={form.fechaFin}
            onChange={(fechaInicio, fechaFin) => setForm((f) => ({ ...f, fechaInicio, fechaFin }))}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SearchableSelect
              label="Proyecto"
              options={proyectos.map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` }))}
              value={form.proyectoId}
              onChange={(v) => setForm((f) => ({ ...f, proyectoId: v }))}
              placeholder="Ninguno"
              emptyText="No hay proyectos que coincidan"
            />
            <SearchableSelect
              label="Equipo"
              options={equipos.map((e) => ({ id: e.id, label: e.nombre }))}
              value={form.equipoId}
              onChange={(v) => setForm((f) => ({ ...f, equipoId: v }))}
              placeholder="Ninguno"
              emptyText="No hay equipos que coincidan"
            />
            <SearchableSelect
              label="Persona"
              options={personas.map((p) => ({ id: p.id, label: p.nombre }))}
              value={form.personaId}
              onChange={(v) => setForm((f) => ({ ...f, personaId: v }))}
              placeholder="Ninguna"
              emptyText="No hay personas que coincidan"
            />
          </div>
          <MarkdownEditor label="Descripción / notas" value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))} />
          </>
        )}
      </FormModal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar evento"
        description={`¿Seguro que quieres eliminar "${evento?.titulo}"?`}
        isLoading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
