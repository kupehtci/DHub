import { Button, Description, Input, Label, TextArea, TextField } from "@heroui/react";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { festivosApi, vacacionesApi } from "../lib/api";
import { AMBITO_FESTIVO_LABEL } from "../lib/format";
import type { AmbitoFestivo, Equipo, Festivo, Persona, Vacacion } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { DateRangeField } from "./DateRangeField";
import { FormModal } from "./FormModal";
import { SearchableMultiSelect } from "./SearchableMultiSelect";
import { SearchableSelect } from "./SearchableSelect";
import { SelectField } from "./SelectField";

export type TipoAusencia = "vacaciones" | "festivo";

const AMBITOS: AmbitoFestivo[] = ["Nacional", "Autonomico", "Local", "Otro"];

interface FormState {
  tipo: TipoAusencia;
  // Vacaciones
  personaId: string | null;
  // Festivo
  nombre: string;
  ambito: AmbitoFestivo;
  personaIds: string[];
  // Comunes
  fechaInicio: string;
  fechaFin: string;
  comentario: string;
}

function emptyForm(tipo: TipoAusencia, personas: Persona[], personaId?: string, fecha?: string): FormState {
  return {
    tipo,
    personaId: personaId ?? null,
    nombre: "",
    ambito: "Nacional",
    // Un festivo nacional afecta a todos: se preseleccionan todas las personas.
    personaIds: personas.map((p) => p.id),
    fechaInicio: fecha ?? "",
    fechaFin: fecha ?? "",
    comentario: "",
  };
}

export function VacacionFormModal({
  isOpen,
  onOpenChange,
  vacacion,
  festivo,
  defaultTipo = "vacaciones",
  defaultPersonaId,
  defaultFecha,
  personas,
  equipos,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  vacacion: Vacacion | null;
  festivo: Festivo | null;
  defaultTipo?: TipoAusencia;
  defaultPersonaId?: string;
  defaultFecha?: string;
  // Todas las personas (no solo las del filtro): un festivo puede afectar a cualquiera.
  personas: Persona[];
  equipos: Equipo[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultTipo, personas, defaultPersonaId, defaultFecha));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editando = vacacion ?? festivo;

  useEffect(() => {
    if (!isOpen) return;
    if (vacacion) {
      setForm({
        ...emptyForm("vacaciones", personas),
        personaId: vacacion.personaId,
        fechaInicio: vacacion.fechaInicio,
        fechaFin: vacacion.fechaFin,
        comentario: vacacion.comentario ?? "",
      });
    } else if (festivo) {
      setForm({
        ...emptyForm("festivo", personas),
        nombre: festivo.nombre,
        ambito: festivo.ambito,
        personaIds: festivo.personaIds,
        fechaInicio: festivo.fechaInicio,
        fechaFin: festivo.fechaFin,
        comentario: festivo.comentario ?? "",
      });
    } else {
      setForm(emptyForm(defaultTipo, personas, defaultPersonaId, defaultFecha));
    }
    setError(null);
    // personas solo se usa para la preselección inicial al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vacacion, festivo, defaultTipo, defaultPersonaId, defaultFecha]);

  const opcionesPersonas = useMemo(() => personas.map((p) => ({ id: p.id, label: p.nombre })), [personas]);
  const esFestivo = form.tipo === "festivo";

  const anadirEquipo = (equipoId: string | null) => {
    if (!equipoId) return;
    const miembros = personas.filter((p) => p.equipos.some((e) => e.id === equipoId)).map((p) => p.id);
    setForm((f) => ({ ...f, personaIds: Array.from(new Set([...f.personaIds, ...miembros])) }));
  };

  const handleSave = async () => {
    setError(null);
    if (!form.fechaInicio || !form.fechaFin) {
      setError("Indica la fecha de inicio y de fin.");
      return;
    }
    if (esFestivo) {
      if (!form.nombre.trim()) {
        setError("Indica el nombre del festivo.");
        return;
      }
      if (form.personaIds.length === 0) {
        setError("Selecciona al menos una persona a la que afecte el festivo.");
        return;
      }
    } else if (!form.personaId) {
      setError("Selecciona una persona.");
      return;
    }
    setSaving(true);
    try {
      if (esFestivo) {
        const payload = {
          nombre: form.nombre.trim(),
          ambito: form.ambito,
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          comentario: form.comentario || null,
          personaIds: form.personaIds,
        };
        if (festivo) await festivosApi.actualizar(festivo.id, payload);
        else await festivosApi.crear(payload);
      } else {
        const payload = { fechaInicio: form.fechaInicio, fechaFin: form.fechaFin, comentario: form.comentario || null };
        if (vacacion) await vacacionesApi.actualizar(vacacion.id, payload);
        else await vacacionesApi.crear({ ...payload, personaId: form.personaId! });
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const mensaje = axios.isAxiosError(err) && typeof err.response?.data === "string" ? err.response.data : null;
      setError(mensaje ?? `No se ha podido guardar ${esFestivo ? "el festivo" : "la vacación"}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editando) return;
    setDeleting(true);
    try {
      if (festivo) await festivosApi.eliminar(festivo.id);
      else if (vacacion) await vacacionesApi.eliminar(vacacion.id);
      setConfirmDelete(false);
      onOpenChange(false);
      onSaved();
    } finally {
      setDeleting(false);
    }
  };

  const titulo = vacacion ? "Editar vacación" : festivo ? "Editar festivo" : esFestivo ? "Nuevo festivo" : "Nueva vacación";

  const tipoBoton = (tipo: TipoAusencia, texto: string) => (
    <button
      type="button"
      onClick={() => setForm((f) => ({ ...f, tipo }))}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        form.tipo === tipo ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <>
      <FormModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="lg"
        title={titulo}
        footer={
          <>
            {editando ? (
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

        {!editando ? (
          <div className="flex rounded-lg bg-surface-secondary p-1">
            {tipoBoton("vacaciones", "Vacaciones")}
            {tipoBoton("festivo", "Festivo")}
          </div>
        ) : null}

        {esFestivo ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px]">
              <TextField isRequired value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}>
                <Label>Nombre del festivo</Label>
                <Input placeholder="Día de Aragón, Fiesta local…" />
              </TextField>
              <SelectField
                label="Ámbito"
                options={AMBITOS.map((a) => ({ id: a, label: AMBITO_FESTIVO_LABEL[a] }))}
                value={form.ambito}
                onChange={(v) => setForm((f) => ({ ...f, ambito: (v as AmbitoFestivo) ?? "Nacional" }))}
              />
            </div>
            <DateRangeField
              label="Fechas"
              start={form.fechaInicio}
              end={form.fechaFin}
              onChange={(fechaInicio, fechaFin) => setForm((f) => ({ ...f, fechaInicio, fechaFin }))}
              description="Para un único día, pulsa dos veces la misma fecha."
            />
            <div className="flex flex-col gap-2">
              <SearchableMultiSelect
                label={`Personas afectadas (${form.personaIds.length} de ${personas.length})`}
                values={form.personaIds}
                onChange={(personaIds) => setForm((f) => ({ ...f, personaIds }))}
                options={opcionesPersonas}
                placeholder="Escribe para buscar personas…"
                emptyText="No hay personas que coincidan"
              />
              <div className="flex flex-wrap items-end gap-2">
                <Button size="sm" variant="secondary" onPress={() => setForm((f) => ({ ...f, personaIds: personas.map((p) => p.id) }))}>
                  Todas
                </Button>
                <Button size="sm" variant="ghost" onPress={() => setForm((f) => ({ ...f, personaIds: [] }))}>
                  Ninguna
                </Button>
                {equipos.length ? (
                  <div className="w-56">
                    <SearchableSelect
                      label="Añadir un equipo completo"
                      options={equipos.map((e) => ({ id: e.id, label: e.nombre }))}
                      value={null}
                      onChange={anadirEquipo}
                      placeholder="Busca un equipo…"
                      emptyText="No hay equipos que coincidan"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <>
            {vacacion ? (
              <TextField isReadOnly value={vacacion.personaNombre}>
                <Label>Persona</Label>
                <Input />
              </TextField>
            ) : (
              <SearchableSelect
                isRequired
                clearable={false}
                label="Persona"
                options={opcionesPersonas}
                value={form.personaId}
                onChange={(v) => setForm((f) => ({ ...f, personaId: v }))}
                placeholder="Escribe para buscar…"
                emptyText="No hay personas que coincidan"
              />
            )}
            <DateRangeField
              label="Fechas"
              start={form.fechaInicio}
              end={form.fechaFin}
              onChange={(fechaInicio, fechaFin) => setForm((f) => ({ ...f, fechaInicio, fechaFin }))}
              description="Ambas fechas cuentan como días de vacación (inclusive)."
            />
          </>
        )}

        <TextField value={form.comentario} onChange={(v) => setForm((f) => ({ ...f, comentario: v }))}>
          <Label>Comentario</Label>
          <TextArea rows={2} placeholder="Opcional" />
          {esFestivo ? <Description>Los festivos se muestran en verde en el calendario de vacaciones.</Description> : null}
        </TextField>
      </FormModal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={festivo ? "Eliminar festivo" : "Eliminar vacación"}
        description={
          festivo
            ? `¿Seguro que quieres eliminar el festivo "${festivo.nombre}"? Se quitará para las ${festivo.personaIds.length} personas afectadas.`
            : `¿Seguro que quieres eliminar esta vacación de ${vacacion?.personaNombre}?`
        }
        isLoading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
