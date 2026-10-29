import { Button, Description, Input, Label, TextField } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FormModal } from "../components/FormModal";
import { IconDownload, IconPlus } from "../components/Icons";
import { MultiSelectField } from "../components/MultiSelectField";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { SelectField } from "../components/SelectField";
import { StatusChip } from "../components/StatusChip";
import { equiposApi, personasApi } from "../lib/api";
import { ESTADO_PERSONA_COLOR, ESTADO_PERSONA_LABEL, formatHoras } from "../lib/format";
import type { Equipo, EstadoPersona, Persona } from "../types";

const ESTADOS: EstadoPersona[] = ["Activo", "Vacaciones", "BajaTemporal", "Inactivo"];

interface FormState {
  id?: string;
  nombre: string;
  email: string;
  rol: string;
  equipoIds: string[];
  disponibilidadSemanalHoras: string;
  estado: EstadoPersona;
}

const EMPTY_FORM: FormState = {
  nombre: "",
  email: "",
  rol: "",
  equipoIds: [],
  disponibilidadSemanalHoras: "40",
  estado: "Activo",
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filtroEquipo, setFiltroEquipo] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Persona | null>(null);

  const cargar = () => {
    setLoading(true);
    personasApi
      .listar({ q: q || undefined, equipoId: filtroEquipo ?? undefined, estado: filtroEstado ?? undefined })
      .then((r) => setPersonas(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    equiposApi.listar().then((r) => setEquipos(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filtroEquipo, filtroEstado]);

  const equipoOptions = useMemo(() => equipos.map((e) => ({ id: e.id, label: e.nombre })), [equipos]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Persona) => {
    setForm({
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      rol: p.rol,
      equipoIds: p.equipos.map((e) => e.id),
      disponibilidadSemanalHoras: String(p.disponibilidadSemanalHoras),
      estado: p.estado,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
        equipoIds: form.equipoIds,
        disponibilidadSemanalHoras: Number(form.disponibilidadSemanalHoras) || 0,
        estado: form.estado,
      };
      if (form.id) {
        await personasApi.actualizar(form.id, payload);
      } else {
        await personasApi.crear(payload);
      }
      setModalOpen(false);
      cargar();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await personasApi.eliminar(deleteTarget.id);
    setDeleteTarget(null);
    cargar();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Personas</h1>
          <p className="text-sm text-muted">Equipo multidisciplinar: carga, estado y asignaciones.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onPress={() =>
              window.open(personasApi.exportUrl({ q: q || undefined, equipoId: filtroEquipo ?? undefined, estado: filtroEstado ?? undefined }))
            }
          >
            <IconDownload />
            Exportar CSV
          </Button>
          <Button onPress={openCreate}>
            <IconPlus />
            Nueva persona
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <TextField value={q} onChange={setQ}>
            <Label>Buscar</Label>
            <Input placeholder="Nombre, email o rol..." />
          </TextField>
        </div>
        <div className="w-56">
          <SelectField emptyOption="Todos los equipos" label="Equipo" options={equipoOptions} value={filtroEquipo} onChange={setFiltroEquipo} />
        </div>
        <div className="w-48">
          <SelectField
            emptyOption="Todos los estados"
            label="Estado"
            options={ESTADOS.map((e) => ({ id: e, label: ESTADO_PERSONA_LABEL[e] }))}
            value={filtroEstado}
            onChange={setFiltroEstado}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Equipos</th>
              <th className="px-4 py-3 font-medium">Carga activa</th>
              <th className="px-4 py-3 font-medium">Bloqueadas</th>
              <th className="px-4 py-3 font-medium">Vencidas</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={8}>
                  Cargando...
                </td>
              </tr>
            ) : personas.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={8}>
                  No se encontraron personas.
                </td>
              </tr>
            ) : (
              personas.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-secondary">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <PersonaAvatar id={p.id} nombre={p.nombre} size="sm" />
                      <div>
                        <Link to={`/personas/${p.id}`} className="font-medium text-link hover:underline">
                          {p.nombre}
                        </Link>
                        <p className="text-xs text-muted">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.rol}</td>
                  <td className="px-4 py-3">
                    {p.equipos.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {p.equipos.map((e) => (
                          <StatusChip key={e.id} color="default" label={e.nombre} />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatHoras(p.cargaHoras)} / {formatHoras(p.disponibilidadSemanalHoras)}
                  </td>
                  <td className="px-4 py-3">{p.tareasBloqueadas}</td>
                  <td className="px-4 py-3">{p.tareasVencidas}</td>
                  <td className="px-4 py-3">
                    <StatusChip color={ESTADO_PERSONA_COLOR[p.estado]} label={ESTADO_PERSONA_LABEL[p.estado]} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onPress={() => openEdit(p)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onPress={() => setDeleteTarget(p)}>
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FormModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        title={form.id ? "Editar persona" : "Nueva persona"}
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
          <Input placeholder="Nombre y apellidos" />
        </TextField>
        <TextField isRequired type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))}>
          <Label>Email</Label>
          <Input placeholder="persona@hiberus.com" />
        </TextField>
        <TextField isRequired value={form.rol} onChange={(v) => setForm((f) => ({ ...f, rol: v }))}>
          <Label>Rol</Label>
          <Input placeholder="Backend Developer, QA, Tech Lead..." />
        </TextField>
        <MultiSelectField
          label="Equipos"
          options={equipoOptions}
          placeholder="Sin equipos asignados"
          values={form.equipoIds}
          onChange={(v) => setForm((f) => ({ ...f, equipoIds: v }))}
        />
        <TextField value={form.disponibilidadSemanalHoras} onChange={(v) => setForm((f) => ({ ...f, disponibilidadSemanalHoras: v }))}>
          <Label>Disponibilidad semanal (horas)</Label>
          <Input inputMode="decimal" placeholder="40" />
          <Description>Horas/semana dedicadas a proyectos</Description>
        </TextField>
        <SelectField
          label="Estado"
          options={ESTADOS.map((e) => ({ id: e, label: ESTADO_PERSONA_LABEL[e] }))}
          value={form.estado}
          onChange={(v) => setForm((f) => ({ ...f, estado: (v as EstadoPersona) ?? "Activo" }))}
        />
      </FormModal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar persona"
        description={`¿Seguro que quieres eliminar a ${deleteTarget?.nombre}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
