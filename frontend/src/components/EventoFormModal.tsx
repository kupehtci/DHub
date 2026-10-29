import { Button, Input, Label, TextArea, TextField } from "@heroui/react";
import { useEffect, useState } from "react";
import { eventosApi } from "../lib/api";
import { TIPO_EVENTO_LABEL } from "../lib/format";
import type { Equipo, Evento, Persona, Proyecto, TipoEvento } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { FormModal } from "./FormModal";
import { SelectField } from "./SelectField";

const TIPOS: TipoEvento[] = ["Reunion", "Entrega", "Hito", "Otro"];

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
  tipo: TipoEvento;
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

  useEffect(() => {
    if (!isOpen) return;
    if (evento) {
      setForm({
        titulo: evento.titulo,
        descripcion: evento.descripcion ?? "",
        tipo: evento.tipo,
        fechaInicio: toLocalInput(evento.fechaInicio),
        fechaFin: toLocalInput(evento.fechaFin),
        proyectoId: evento.proyectoId,
        equipoId: evento.equipoId,
        personaId: evento.personaId,
      });
    } else {
      setForm(emptyForm(defaultFechaInicio));
    }
  }, [isOpen, evento, defaultFechaInicio]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        tipo: form.tipo,
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
        title={evento ? "Editar evento" : "Nuevo evento"}
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
        <TextField isRequired value={form.titulo} onChange={(v) => setForm((f) => ({ ...f, titulo: v }))}>
          <Label>Título</Label>
          <Input placeholder="Comité de seguimiento..." />
        </TextField>
        <TextField value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}>
          <Label>Descripción</Label>
          <TextArea rows={2} />
        </TextField>
        <SelectField label="Tipo" options={TIPOS.map((t) => ({ id: t, label: TIPO_EVENTO_LABEL[t] }))} value={form.tipo} onChange={(v) => setForm((f) => ({ ...f, tipo: (v as TipoEvento) ?? "Reunion" }))} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField isRequired type="datetime-local" value={form.fechaInicio} onChange={(v) => setForm((f) => ({ ...f, fechaInicio: v }))}>
            <Label>Inicio</Label>
            <Input />
          </TextField>
          <TextField type="datetime-local" value={form.fechaFin} onChange={(v) => setForm((f) => ({ ...f, fechaFin: v }))}>
            <Label>Fin (opcional)</Label>
            <Input />
          </TextField>
        </div>
        <SelectField emptyOption="Ninguno" label="Proyecto" options={proyectos.map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` }))} value={form.proyectoId} onChange={(v) => setForm((f) => ({ ...f, proyectoId: v }))} />
        <SelectField emptyOption="Ninguno" label="Equipo" options={equipos.map((e) => ({ id: e.id, label: e.nombre }))} value={form.equipoId} onChange={(v) => setForm((f) => ({ ...f, equipoId: v }))} />
        <SelectField emptyOption="Ninguna" label="Persona" options={personas.map((p) => ({ id: p.id, label: p.nombre }))} value={form.personaId} onChange={(v) => setForm((f) => ({ ...f, personaId: v }))} />
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
