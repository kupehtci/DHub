import { Button, Input, Label, TextArea, TextField } from "@heroui/react";
import { useEffect, useState } from "react";
import { riesgosApi } from "../lib/api";
import { IMPACTO_LABEL, PROBABILIDAD_LABEL } from "../lib/format";
import type { EstadoRiesgo, ImpactoRiesgo, Persona, ProbabilidadRiesgo, Riesgo, Tarea } from "../types";
import { FormModal } from "./FormModal";
import { SelectField } from "./SelectField";
import type { ProyectoOption } from "./TareaFormModal";

const IMPACTOS: ImpactoRiesgo[] = ["Bajo", "Medio", "Alto", "Critico"];
const PROBABILIDADES: ProbabilidadRiesgo[] = ["Baja", "Media", "Alta"];
const ESTADOS: EstadoRiesgo[] = ["Identificado", "EnMitigacion", "Mitigado", "Materializado", "Cerrado"];

const hoyIso = () => new Date().toISOString().slice(0, 10);

interface FormState {
  proyectoId: string | null;
  tareaId: string | null;
  titulo: string;
  descripcion: string;
  impacto: ImpactoRiesgo;
  probabilidad: ProbabilidadRiesgo;
  responsableId: string | null;
  estado: EstadoRiesgo;
  fechaDeteccion: string;
  fechaRevision: string;
}

function emptyForm(proyectoId?: string): FormState {
  return {
    proyectoId: proyectoId ?? null,
    tareaId: null,
    titulo: "",
    descripcion: "",
    impacto: "Medio",
    probabilidad: "Media",
    responsableId: null,
    estado: "Identificado",
    fechaDeteccion: hoyIso(),
    fechaRevision: "",
  };
}

export function RiesgoFormModal({
  isOpen,
  onOpenChange,
  riesgo,
  proyectos,
  personas,
  tareas,
  defaultProyectoId,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  riesgo: Riesgo | null;
  proyectos: ProyectoOption[];
  personas: Persona[];
  tareas: Tarea[];
  defaultProyectoId?: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm(defaultProyectoId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (riesgo) {
      setForm({
        proyectoId: riesgo.proyectoId,
        tareaId: riesgo.tareaId,
        titulo: riesgo.titulo,
        descripcion: riesgo.descripcion ?? "",
        impacto: riesgo.impacto,
        probabilidad: riesgo.probabilidad,
        responsableId: riesgo.responsableId,
        estado: riesgo.estado,
        fechaDeteccion: riesgo.fechaDeteccion,
        fechaRevision: riesgo.fechaRevision ?? "",
      });
    } else {
      setForm(emptyForm(defaultProyectoId));
    }
  }, [isOpen, riesgo, defaultProyectoId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        proyectoId: form.proyectoId,
        tareaId: form.tareaId,
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        impacto: form.impacto,
        probabilidad: form.probabilidad,
        responsableId: form.responsableId,
        estado: form.estado,
        fechaDeteccion: form.fechaDeteccion,
        fechaRevision: form.fechaRevision || null,
      };
      if (riesgo) await riesgosApi.actualizar(riesgo.id, payload);
      else await riesgosApi.crear(payload);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const tareasDelProyecto = tareas.filter((t) => !form.proyectoId || t.proyectoId === form.proyectoId);

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      title={riesgo ? "Editar riesgo / bloqueo" : "Nuevo riesgo / bloqueo"}
      footer={
        <>
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
        <Input placeholder="Retraso del proveedor externo..." />
      </TextField>
      <TextField value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}>
        <Label>Descripción</Label>
        <TextArea rows={3} />
      </TextField>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField emptyOption="Ninguno" label="Proyecto" options={proyectos.map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` }))} value={form.proyectoId} onChange={(v) => setForm((f) => ({ ...f, proyectoId: v, tareaId: null }))} />
        <SelectField emptyOption="Ninguna" label="Tarea relacionada" options={tareasDelProyecto.map((t) => ({ id: t.id, label: t.titulo }))} value={form.tareaId} onChange={(v) => setForm((f) => ({ ...f, tareaId: v }))} />
        <SelectField label="Impacto" options={IMPACTOS.map((i) => ({ id: i, label: IMPACTO_LABEL[i] }))} value={form.impacto} onChange={(v) => setForm((f) => ({ ...f, impacto: (v as ImpactoRiesgo) ?? "Medio" }))} />
        <SelectField label="Probabilidad" options={PROBABILIDADES.map((p) => ({ id: p, label: PROBABILIDAD_LABEL[p] }))} value={form.probabilidad} onChange={(v) => setForm((f) => ({ ...f, probabilidad: (v as ProbabilidadRiesgo) ?? "Media" }))} />
        <SelectField emptyOption="Sin responsable" label="Responsable" options={personas.map((p) => ({ id: p.id, label: p.nombre }))} value={form.responsableId} onChange={(v) => setForm((f) => ({ ...f, responsableId: v }))} />
        <SelectField label="Estado" options={ESTADOS.map((e) => ({ id: e, label: e }))} value={form.estado} onChange={(v) => setForm((f) => ({ ...f, estado: (v as EstadoRiesgo) ?? "Identificado" }))} />
        <TextField isRequired type="date" value={form.fechaDeteccion} onChange={(v) => setForm((f) => ({ ...f, fechaDeteccion: v }))}>
          <Label>Fecha de detección</Label>
          <Input />
        </TextField>
        <TextField type="date" value={form.fechaRevision} onChange={(v) => setForm((f) => ({ ...f, fechaRevision: v }))}>
          <Label>Fecha de revisión</Label>
          <Input />
        </TextField>
      </div>
    </FormModal>
  );
}
