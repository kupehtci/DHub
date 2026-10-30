import { Button, Description, Input, Label, TextArea, TextField } from "@heroui/react";
import { useEffect, useState } from "react";
import { vacacionesApi } from "../lib/api";
import type { Persona, Vacacion } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { FormModal } from "./FormModal";
import { SelectField } from "./SelectField";

interface FormState {
  personaId: string | null;
  fechaInicio: string;
  fechaFin: string;
  comentario: string;
}

function emptyForm(personaId?: string, fecha?: string): FormState {
  return {
    personaId: personaId ?? null,
    fechaInicio: fecha ?? "",
    fechaFin: fecha ?? "",
    comentario: "",
  };
}

export function VacacionFormModal({
  isOpen,
  onOpenChange,
  vacacion,
  defaultPersonaId,
  defaultFecha,
  personas,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  vacacion: Vacacion | null;
  defaultPersonaId?: string;
  defaultFecha?: string;
  personas: Persona[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm(defaultPersonaId, defaultFecha));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (vacacion) {
      setForm({
        personaId: vacacion.personaId,
        fechaInicio: vacacion.fechaInicio,
        fechaFin: vacacion.fechaFin,
        comentario: vacacion.comentario ?? "",
      });
    } else {
      setForm(emptyForm(defaultPersonaId, defaultFecha));
    }
    setError(null);
  }, [isOpen, vacacion, defaultPersonaId, defaultFecha]);

  const handleSave = async () => {
    setError(null);
    if (!form.personaId) {
      setError("Selecciona una persona.");
      return;
    }
    if (!form.fechaInicio || !form.fechaFin) {
      setError("Indica la fecha de inicio y de fin.");
      return;
    }
    if (form.fechaFin < form.fechaInicio) {
      setError("La fecha de fin no puede ser anterior a la de inicio.");
      return;
    }
    setSaving(true);
    try {
      const payload = { fechaInicio: form.fechaInicio, fechaFin: form.fechaFin, comentario: form.comentario || null };
      if (vacacion) {
        await vacacionesApi.actualizar(vacacion.id, payload);
      } else {
        await vacacionesApi.crear({ ...payload, personaId: form.personaId });
      }
      onOpenChange(false);
      onSaved();
    } catch {
      setError("No se ha podido guardar la vacación.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!vacacion) return;
    setDeleting(true);
    try {
      await vacacionesApi.eliminar(vacacion.id);
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
        title={vacacion ? "Editar vacación" : "Nueva vacación"}
        footer={
          <>
            {vacacion ? (
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
        <SelectField
          isRequired
          isDisabled={!!vacacion}
          label="Persona"
          options={personas.map((p) => ({ id: p.id, label: p.nombre }))}
          value={form.personaId}
          onChange={(v) => setForm((f) => ({ ...f, personaId: v }))}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField isRequired type="date" value={form.fechaInicio} onChange={(v) => setForm((f) => ({ ...f, fechaInicio: v }))}>
            <Label>Fecha inicio</Label>
            <Input />
          </TextField>
          <TextField isRequired type="date" value={form.fechaFin} onChange={(v) => setForm((f) => ({ ...f, fechaFin: v }))}>
            <Label>Fecha fin</Label>
            <Input />
          </TextField>
        </div>
        <TextField value={form.comentario} onChange={(v) => setForm((f) => ({ ...f, comentario: v }))}>
          <Label>Comentario</Label>
          <TextArea rows={2} placeholder="Opcional" />
          <Description>Ambas fechas cuentan como días de vacación (inclusive).</Description>
        </TextField>
      </FormModal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar vacación"
        description={`¿Seguro que quieres eliminar esta vacación de ${vacacion?.personaNombre}?`}
        isLoading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
