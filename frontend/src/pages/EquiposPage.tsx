import { Button, Input, Label, TextArea, TextField } from "@heroui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FormModal } from "../components/FormModal";
import { IconFolder, IconPlus, IconUsers } from "../components/Icons";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { SelectField } from "../components/SelectField";
import { StatusChip } from "../components/StatusChip";
import { equiposApi, personasApi } from "../lib/api";
import { ESTADO_EQUIPO_LABEL } from "../lib/format";
import type { Equipo, EstadoEquipo, Persona } from "../types";

interface FormState {
  id?: string;
  nombre: string;
  liderTecnicoId: string | null;
  descripcion: string;
  estado: EstadoEquipo;
}

const EMPTY_FORM: FormState = { nombre: "", liderTecnicoId: null, descripcion: "", estado: "Activo" };

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Equipo | null>(null);

  const cargar = () => {
    setLoading(true);
    equiposApi.listar().then((r) => setEquipos(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    personasApi.listar().then((r) => setPersonas(r.data));
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (e: Equipo) => {
    setForm({ id: e.id, nombre: e.nombre, liderTecnicoId: e.liderTecnicoId, descripcion: e.descripcion ?? "", estado: e.estado });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        liderTecnicoId: form.liderTecnicoId,
        descripcion: form.descripcion || null,
        estado: form.estado,
      };
      if (form.id) await equiposApi.actualizar(form.id, payload);
      else await equiposApi.crear(payload);
      setModalOpen(false);
      cargar();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await equiposApi.eliminar(deleteTarget.id);
    setDeleteTarget(null);
    cargar();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Equipos</h1>
          <p className="text-sm text-muted">Equipos multidisciplinares y su composición.</p>
        </div>
        <Button onPress={openCreate}>
          <IconPlus />
          Nuevo equipo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-sm text-muted">Cargando...</p>
        ) : (
          equipos.map((e) => (
            <div key={e.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link to={`/equipos/${e.id}`} className="font-semibold text-link hover:underline">
                    {e.nombre}
                  </Link>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    Líder:
                    {e.liderTecnicoId ? <PersonaAvatar id={e.liderTecnicoId} nombre={e.liderTecnicoNombre ?? ""} size="sm" /> : null}
                    {e.liderTecnicoNombre ?? "Sin asignar"}
                  </p>
                </div>
                <StatusChip color={e.estado === "Activo" ? "success" : "default"} label={ESTADO_EQUIPO_LABEL[e.estado]} />
              </div>
              {e.descripcion ? <p className="truncate text-sm text-muted">{e.descripcion}</p> : null}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                <span className="flex items-center gap-1.5">
                  <IconUsers width={14} height={14} className="shrink-0 opacity-60" />
                  <strong>{e.numeroMiembros}</strong> miembros
                </span>
                <span className="flex items-center gap-1.5">
                  <IconFolder width={14} height={14} className="shrink-0 opacity-60" />
                  <strong>{e.proyectosActivos}</strong> proyectos
                </span>
              </div>
              <div className="mt-auto flex justify-end gap-2 pt-2">
                <Link to={`/equipos/${e.id}`}>
                  <Button size="sm" variant="secondary">
                    Gestionar miembros
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onPress={() => openEdit(e)}>
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onPress={() => setDeleteTarget(e)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <FormModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        title={form.id ? "Editar equipo" : "Nuevo equipo"}
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
        <TextField isRequired value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}>
          <Label>Nombre</Label>
          <Input placeholder="Equipo Backend Core" />
        </TextField>
        <SelectField
          emptyOption="Sin líder asignado"
          label="Líder técnico"
          options={personas.map((p) => ({ id: p.id, label: p.nombre }))}
          value={form.liderTecnicoId}
          onChange={(v) => setForm((f) => ({ ...f, liderTecnicoId: v }))}
        />
        <TextField value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}>
          <Label>Descripción</Label>
          <TextArea placeholder="Ámbito del equipo" rows={3} />
        </TextField>
        <SelectField
          label="Estado"
          options={[
            { id: "Activo", label: "Activo" },
            { id: "Inactivo", label: "Inactivo" },
          ]}
          value={form.estado}
          onChange={(v) => setForm((f) => ({ ...f, estado: (v as EstadoEquipo) ?? "Activo" }))}
        />
      </FormModal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar equipo"
        description={`¿Seguro que quieres eliminar "${deleteTarget?.nombre}"? Las personas quedarán sin equipo asignado.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
