import { Button, Input, Label, TextArea, TextField } from "@heroui/react";
import { useEffect, useState } from "react";
import { hitosApi, proyectosApi } from "../lib/api";
import { ESTADO_HITO_LABEL } from "../lib/format";
import type { EstadoHito, HitoListado, Proyecto } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { DatePickerField } from "./DatePickerField";
import { FormModal } from "./FormModal";
import { SearchableSelect } from "./SearchableSelect";
import { SelectField } from "./SelectField";

const ESTADOS: EstadoHito[] = ["Pendiente", "EnRiesgo", "Retrasado", "Completado"];

interface FormState {
  proyectoId: string | null;
  nombre: string;
  fecha: string;
  estado: EstadoHito;
  descripcion: string;
}

const hoyIso = () => new Date().toISOString().slice(0, 10);

export function HitoFormModal({
  isOpen,
  onOpenChange,
  hito,
  proyectos,
  defaultProyectoId,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  hito: HitoListado | null;
  proyectos: Pick<Proyecto, "id" | "codigo" | "nombre">[];
  defaultProyectoId?: string | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>({ proyectoId: null, nombre: "", fecha: hoyIso(), estado: "Pendiente", descripcion: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      hito
        ? { proyectoId: hito.proyectoId, nombre: hito.nombre, fecha: hito.fecha, estado: hito.estado, descripcion: hito.descripcion ?? "" }
        : { proyectoId: defaultProyectoId ?? null, nombre: "", fecha: hoyIso(), estado: "Pendiente", descripcion: "" },
    );
    setError(null);
  }, [isOpen, hito, defaultProyectoId]);

  const handleSave = async () => {
    setError(null);
    if (!form.proyectoId) return setError("Selecciona el proyecto del hito.");
    if (!form.nombre.trim()) return setError("Indica el nombre del hito.");
    if (!form.fecha) return setError("Indica la fecha del hito.");
    setSaving(true);
    try {
      const payload = { nombre: form.nombre.trim(), fecha: form.fecha, estado: form.estado, descripcion: form.descripcion || null };
      if (hito) await hitosApi.actualizar(hito.id, payload);
      else await proyectosApi.crearHito(form.proyectoId, { ...payload, proyectoId: form.proyectoId });
      onOpenChange(false);
      onSaved();
    } catch {
      setError("No se ha podido guardar el hito.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!hito) return;
    setDeleting(true);
    try {
      await hitosApi.eliminar(hito.id);
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
        title={hito ? "Editar hito" : "Nuevo hito"}
        footer={
          <>
            {hito ? (
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
        {hito ? (
          // El proyecto de un hito no se puede cambiar una vez creado.
          <TextField isReadOnly value={`${hito.proyectoCodigo} · ${hito.proyectoNombre}`}>
            <Label>Proyecto</Label>
            <Input />
          </TextField>
        ) : (
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
        )}
        <TextField isRequired value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}>
          <Label>Nombre</Label>
          <Input placeholder="Entrega del módulo X" />
        </TextField>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DatePickerField isRequired label="Fecha" value={form.fecha} onChange={(v) => setForm((f) => ({ ...f, fecha: v }))} />
          <SelectField
            label="Estado"
            options={ESTADOS.map((e) => ({ id: e, label: ESTADO_HITO_LABEL[e] }))}
            value={form.estado}
            onChange={(v) => setForm((f) => ({ ...f, estado: (v as EstadoHito) ?? "Pendiente" }))}
          />
        </div>
        <TextField value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}>
          <Label>Descripción</Label>
          <TextArea rows={3} />
        </TextField>
      </FormModal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar hito"
        description={`¿Seguro que quieres eliminar el hito "${hito?.nombre}"?`}
        isLoading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
