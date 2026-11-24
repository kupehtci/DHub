import { Button, Input, Label, TextField } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { DatePickerField } from "./DatePickerField";
import { FormModal } from "./FormModal";
import { SelectField } from "./SelectField";
import { equiposApi, jiraApi, personasApi, proyectosApi } from "../lib/api";
import { ESTADO_PROYECTO_LABEL, PRIORIDAD_LABEL } from "../lib/format";
import type { Equipo, EstadoProyecto, JiraEspacio, Persona, Prioridad, Proyecto } from "../types";

const ESTADOS: EstadoProyecto[] = ["Planificado", "EnCurso", "EnPausa", "Cerrado", "Cancelado"];
const PRIORIDADES: Prioridad[] = ["Baja", "Media", "Alta", "Critica"];

/** Campos editables de un proyecto (sirve tanto `Proyecto` como `ProyectoDetalle`). */
export type ProyectoEditable = Pick<
  Proyecto,
  | "id"
  | "nombre"
  | "codigo"
  | "sistemaInformacion"
  | "clienteArea"
  | "responsableId"
  | "equipoId"
  | "estado"
  | "fechaInicio"
  | "fechaFin"
  | "prioridad"
  | "jiraClaveProyecto"
  | "jiraProyectoUrl"
>;

interface FormState {
  id?: string;
  nombre: string;
  codigo: string;
  sistemaInformacion: string;
  clienteArea: string;
  responsableId: string | null;
  equipoId: string | null;
  estado: EstadoProyecto;
  fechaInicio: string;
  fechaFin: string;
  prioridad: Prioridad;
  jiraClaveProyecto: string;
  jiraProyectoUrl: string;
}

const hoyIso = () => new Date().toISOString().slice(0, 10);

const formVacio = (): FormState => ({
  nombre: "",
  codigo: "",
  sistemaInformacion: "",
  clienteArea: "",
  responsableId: null,
  equipoId: null,
  estado: "Planificado",
  fechaInicio: hoyIso(),
  fechaFin: "",
  prioridad: "Media",
  jiraClaveProyecto: "",
  jiraProyectoUrl: "",
});

const formDesdeProyecto = (p: ProyectoEditable): FormState => ({
  id: p.id,
  nombre: p.nombre,
  codigo: p.codigo,
  sistemaInformacion: p.sistemaInformacion,
  clienteArea: p.clienteArea,
  responsableId: p.responsableId,
  equipoId: p.equipoId,
  estado: p.estado,
  fechaInicio: p.fechaInicio,
  fechaFin: p.fechaFin ?? "",
  prioridad: p.prioridad,
  jiraClaveProyecto: p.jiraClaveProyecto ?? "",
  jiraProyectoUrl: p.jiraProyectoUrl ?? "",
});

/** Modal de alta / edición de proyecto. Si `proyecto` es null, crea uno nuevo. */
export function ProyectoFormModal({
  isOpen,
  onOpenChange,
  proyecto,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  proyecto: ProyectoEditable | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(formVacio);
  const [saving, setSaving] = useState(false);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [espaciosJira, setEspaciosJira] = useState<JiraEspacio[]>([]);
  const [jiraBaseUrl, setJiraBaseUrl] = useState<string | null>(null);

  useEffect(() => {
    equiposApi.listar().then((r) => setEquipos(r.data));
    personasApi.listar().then((r) => setPersonas(r.data));
    jiraApi.espacios().then((r) => setEspaciosJira(r.data));
    jiraApi.configuracion().then((r) => setJiraBaseUrl(r.data.baseUrl));
  }, []);

  // Cada vez que se abre, se carga el proyecto actual (o un formulario vacío).
  useEffect(() => {
    if (isOpen) setForm(proyecto ? formDesdeProyecto(proyecto) : formVacio());
  }, [isOpen, proyecto]);

  const equipoOptions = useMemo(() => equipos.map((e) => ({ id: e.id, label: e.nombre })), [equipos]);
  const personaOptions = useMemo(() => personas.map((p) => ({ id: p.id, label: p.nombre })), [personas]);
  const espacioJiraOptions = useMemo(() => {
    const opciones = espaciosJira.map((e) => ({ id: e.clave, label: `${e.clave} · ${e.nombre}` }));
    if (form.jiraClaveProyecto && !espaciosJira.some((e) => e.clave === form.jiraClaveProyecto)) {
      opciones.unshift({ id: form.jiraClaveProyecto, label: `${form.jiraClaveProyecto} (fuera del catálogo)` });
    }
    return opciones;
  }, [espaciosJira, form.jiraClaveProyecto]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        codigo: form.codigo,
        sistemaInformacion: form.sistemaInformacion,
        clienteArea: form.clienteArea,
        responsableId: form.responsableId,
        equipoId: form.equipoId,
        estado: form.estado,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin || null,
        prioridad: form.prioridad,
        jiraClaveProyecto: form.jiraClaveProyecto || null,
        jiraProyectoUrl: form.jiraProyectoUrl || null,
      };
      if (form.id) await proyectosApi.actualizar(form.id, payload);
      else await proyectosApi.crear(payload);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      title={form.id ? "Editar proyecto" : "Nuevo proyecto"}
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField isRequired value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}>
          <Label>Nombre</Label>
          <Input placeholder="Sistema de Gestión de Expedientes" />
        </TextField>
        <TextField isRequired value={form.codigo} onChange={(v) => setForm((f) => ({ ...f, codigo: v }))}>
          <Label>Código</Label>
          <Input placeholder="SIGEX" />
        </TextField>
        <TextField isRequired value={form.sistemaInformacion} onChange={(v) => setForm((f) => ({ ...f, sistemaInformacion: v }))}>
          <Label>Sistema de información</Label>
          <Input placeholder="SIGEX" />
        </TextField>
        <TextField isRequired value={form.clienteArea} onChange={(v) => setForm((f) => ({ ...f, clienteArea: v }))}>
          <Label>Cliente / Área</Label>
          <Input placeholder="Dirección General de..." />
        </TextField>
        <SelectField emptyOption="Sin responsable" label="Responsable" options={personaOptions} value={form.responsableId} onChange={(v) => setForm((f) => ({ ...f, responsableId: v }))} />
        <SelectField emptyOption="Sin equipo" label="Equipo" options={equipoOptions} value={form.equipoId} onChange={(v) => setForm((f) => ({ ...f, equipoId: v }))} />
        <SelectField label="Estado" options={ESTADOS.map((e) => ({ id: e, label: ESTADO_PROYECTO_LABEL[e] }))} value={form.estado} onChange={(v) => setForm((f) => ({ ...f, estado: (v as EstadoProyecto) ?? "Planificado" }))} />
        <SelectField label="Prioridad" options={PRIORIDADES.map((p) => ({ id: p, label: PRIORIDAD_LABEL[p] }))} value={form.prioridad} onChange={(v) => setForm((f) => ({ ...f, prioridad: (v as Prioridad) ?? "Media" }))} />
        <DatePickerField isRequired label="Fecha inicio" value={form.fechaInicio} onChange={(v) => setForm((f) => ({ ...f, fechaInicio: v }))} />
        <DatePickerField label="Fecha fin estimada" value={form.fechaFin} onChange={(v) => setForm((f) => ({ ...f, fechaFin: v }))} />
        <SelectField
          emptyOption="Sin espacio Jira asociado"
          label="Jira · espacio del catálogo"
          options={espacioJiraOptions}
          value={form.jiraClaveProyecto || null}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              jiraClaveProyecto: v ?? "",
              jiraProyectoUrl: v && jiraBaseUrl ? `${jiraBaseUrl.replace(/\/$/, "")}/browse/${v}` : f.jiraProyectoUrl,
            }))
          }
        />
        <TextField value={form.jiraProyectoUrl} onChange={(v) => setForm((f) => ({ ...f, jiraProyectoUrl: v }))}>
          <Label>Jira · tablero del proyecto (URL)</Label>
          <Input placeholder="https://empresa.atlassian.net/jira/software/projects/SIGEX/boards/1" />
        </TextField>
      </div>
    </FormModal>
  );
}
