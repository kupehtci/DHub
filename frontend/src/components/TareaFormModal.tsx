import { Button, Description, Input, Label, TextArea, TextField } from "@heroui/react";
import { useEffect, useState } from "react";
import { notasApi, tareasApi } from "../lib/api";
import { PRIORIDAD_LABEL, TIPO_TAREA_LABEL } from "../lib/format";
import { ESTADOS_TAREA, type EstadoTarea, type Nota, type Persona, type Prioridad, type Proyecto, type Tarea, type TipoTarea } from "../types";
import { FormModal } from "./FormModal";
import { SelectField } from "./SelectField";

const TIPOS: TipoTarea[] = ["HistoriaUsuario", "Bug", "Tarea", "Mejora", "Soporte"];
const PRIORIDADES: Prioridad[] = ["Baja", "Media", "Alta", "Critica"];

export type ProyectoOption = Pick<Proyecto, "id" | "codigo" | "nombre">;

interface FormState {
  titulo: string;
  descripcion: string;
  tipo: TipoTarea;
  estado: EstadoTarea;
  prioridad: Prioridad;
  proyectoId: string;
  responsableId: string | null;
  estimacionHoras: string;
  fechaInicio: string;
  fechaObjetivo: string;
  motivoBloqueo: string;
  responsableBloqueoId: string | null;
  fechaRevisionBloqueo: string;
  jiraTicketClave: string;
  jiraTicketUrl: string;
}

function emptyForm(proyectoId?: string): FormState {
  return {
    titulo: "",
    descripcion: "",
    tipo: "Tarea",
    estado: "Backlog",
    prioridad: "Media",
    proyectoId: proyectoId ?? "",
    responsableId: null,
    estimacionHoras: "8",
    fechaInicio: "",
    fechaObjetivo: "",
    motivoBloqueo: "",
    responsableBloqueoId: null,
    fechaRevisionBloqueo: "",
    jiraTicketClave: "",
    jiraTicketUrl: "",
  };
}

export function TareaFormModal({
  isOpen,
  onOpenChange,
  tarea,
  proyectos,
  personas,
  defaultProyectoId,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tarea: Tarea | null;
  proyectos: ProyectoOption[];
  personas: Persona[];
  defaultProyectoId?: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm(defaultProyectoId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [comentarios, setComentarios] = useState<Nota[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [autorComentario, setAutorComentario] = useState<string | null>(null);

  const cargarComentarios = (tareaId: string) => {
    notasApi.listar({ tareaId }).then((r) => setComentarios(r.data.filter((n) => n.tipo === "Comentario")));
  };

  useEffect(() => {
    if (!isOpen) return;
    if (tarea) {
      setForm({
        titulo: tarea.titulo,
        descripcion: tarea.descripcion ?? "",
        tipo: tarea.tipo,
        estado: tarea.estado,
        prioridad: tarea.prioridad,
        proyectoId: tarea.proyectoId,
        responsableId: tarea.responsableId,
        estimacionHoras: String(tarea.estimacionHoras),
        fechaInicio: tarea.fechaInicio ?? "",
        fechaObjetivo: tarea.fechaObjetivo ?? "",
        motivoBloqueo: tarea.motivoBloqueo ?? "",
        responsableBloqueoId: tarea.responsableBloqueoId,
        fechaRevisionBloqueo: tarea.fechaRevisionBloqueo ?? "",
        jiraTicketClave: tarea.jiraTicketClave ?? "",
        jiraTicketUrl: tarea.jiraTicketUrl ?? "",
      });
      cargarComentarios(tarea.id);
    } else {
      setForm(emptyForm(defaultProyectoId));
      setComentarios([]);
    }
    setNuevoComentario("");
    setError(null);
  }, [isOpen, tarea, defaultProyectoId]);

  const isBloqueada = form.estado === "Bloqueada";

  const handleSave = async () => {
    setError(null);
    if (isBloqueada && (!form.motivoBloqueo || !form.responsableBloqueoId || !form.fechaRevisionBloqueo)) {
      setError("Una tarea bloqueada debe tener motivo, responsable y fecha de revisión.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        tipo: form.tipo,
        estado: form.estado,
        prioridad: form.prioridad,
        proyectoId: form.proyectoId,
        responsableId: form.responsableId,
        estimacionHoras: Number(form.estimacionHoras) || 0,
        fechaInicio: form.fechaInicio || null,
        fechaObjetivo: form.fechaObjetivo || null,
        fechaCierre: tarea?.fechaCierre ?? null,
        motivoBloqueo: isBloqueada ? form.motivoBloqueo : null,
        responsableBloqueoId: isBloqueada ? form.responsableBloqueoId : null,
        fechaRevisionBloqueo: isBloqueada ? form.fechaRevisionBloqueo || null : null,
        jiraTicketClave: form.jiraTicketClave || null,
        jiraTicketUrl: form.jiraTicketUrl || null,
      };
      if (tarea) {
        await tareasApi.actualizar(tarea.id, payload);
      } else {
        await tareasApi.crear(payload);
      }
      onOpenChange(false);
      onSaved();
    } catch {
      setError("No se ha podido guardar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddComentario = async () => {
    if (!tarea || !autorComentario || !nuevoComentario.trim()) return;
    await notasApi.crear({ autorId: autorComentario, tipo: "Comentario", texto: nuevoComentario, tareaId: tarea.id });
    setNuevoComentario("");
    cargarComentarios(tarea.id);
  };

  const handleDeleteComentario = async (id: string) => {
    if (!tarea) return;
    await notasApi.eliminar(id);
    cargarComentarios(tarea.id);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      title={tarea ? "Editar tarea" : "Nueva tarea"}
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
      {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
      <TextField isRequired value={form.titulo} onChange={(v) => setForm((f) => ({ ...f, titulo: v }))}>
        <Label>Título</Label>
        <Input placeholder="Descripción corta de la tarea" />
      </TextField>
      <TextField value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}>
        <Label>Descripción</Label>
        <TextArea rows={3} />
      </TextField>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField
          isRequired
          label="Proyecto"
          options={proyectos.map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` }))}
          value={form.proyectoId}
          onChange={(v) => setForm((f) => ({ ...f, proyectoId: v ?? "" }))}
        />
        <SelectField emptyOption="Sin responsable" label="Responsable" options={personas.map((p) => ({ id: p.id, label: p.nombre }))} value={form.responsableId} onChange={(v) => setForm((f) => ({ ...f, responsableId: v }))} />
        <SelectField label="Tipo" options={TIPOS.map((t) => ({ id: t, label: TIPO_TAREA_LABEL[t] }))} value={form.tipo} onChange={(v) => setForm((f) => ({ ...f, tipo: (v as TipoTarea) ?? "Tarea" }))} />
        <SelectField label="Prioridad" options={PRIORIDADES.map((p) => ({ id: p, label: PRIORIDAD_LABEL[p] }))} value={form.prioridad} onChange={(v) => setForm((f) => ({ ...f, prioridad: (v as Prioridad) ?? "Media" }))} />
        <SelectField
          label="Estado"
          options={ESTADOS_TAREA.map((e) => ({ id: e, label: e }))}
          value={form.estado}
          onChange={(v) => setForm((f) => ({ ...f, estado: (v as EstadoTarea) ?? "Backlog" }))}
        />
        <TextField value={form.estimacionHoras} onChange={(v) => setForm((f) => ({ ...f, estimacionHoras: v }))}>
          <Label>Estimación (horas)</Label>
          <Input inputMode="decimal" />
        </TextField>
        <TextField type="date" value={form.fechaInicio} onChange={(v) => setForm((f) => ({ ...f, fechaInicio: v }))}>
          <Label>Fecha inicio</Label>
          <Input />
        </TextField>
        <TextField type="date" value={form.fechaObjetivo} onChange={(v) => setForm((f) => ({ ...f, fechaObjetivo: v }))}>
          <Label>Fecha objetivo</Label>
          <Input />
        </TextField>
        <TextField value={form.jiraTicketClave} onChange={(v) => setForm((f) => ({ ...f, jiraTicketClave: v }))}>
          <Label>Jira · clave del ticket</Label>
          <Input placeholder="SIGEX-101" />
        </TextField>
        <TextField value={form.jiraTicketUrl} onChange={(v) => setForm((f) => ({ ...f, jiraTicketUrl: v }))}>
          <Label>Jira · enlace del ticket</Label>
          <Input placeholder="https://empresa.atlassian.net/browse/SIGEX-101" />
          <Description>Enlace manual. La integración automática con la API de Jira llegará más adelante.</Description>
        </TextField>
      </div>

      {isBloqueada ? (
        <div className="flex flex-col gap-4 rounded-xl border border-danger/30 bg-danger-soft/30 p-3">
          <p className="text-sm font-medium text-danger">Datos del bloqueo (obligatorios)</p>
          <TextField isRequired value={form.motivoBloqueo} onChange={(v) => setForm((f) => ({ ...f, motivoBloqueo: v }))}>
            <Label>Motivo del bloqueo</Label>
            <TextArea rows={2} />
          </TextField>
          <SelectField
            isRequired
            label="Responsable del desbloqueo"
            options={personas.map((p) => ({ id: p.id, label: p.nombre }))}
            value={form.responsableBloqueoId}
            onChange={(v) => setForm((f) => ({ ...f, responsableBloqueoId: v }))}
          />
          <TextField isRequired type="date" value={form.fechaRevisionBloqueo} onChange={(v) => setForm((f) => ({ ...f, fechaRevisionBloqueo: v }))}>
            <Label>Fecha de revisión</Label>
            <Input />
            <Description>Fecha en la que se revisará si el bloqueo sigue vigente</Description>
          </TextField>
        </div>
      ) : null}

      {tarea ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Comentarios ({comentarios.length})</p>
          <div className="flex flex-col gap-2">
            {comentarios.length === 0 ? (
              <p className="text-sm text-muted">Todavía no hay comentarios en esta tarea.</p>
            ) : (
              comentarios.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg bg-surface-secondary/60 px-3 py-2 text-sm">
                  <div>
                    <p className="text-xs text-muted">
                      {c.autorNombre} · {new Date(c.fecha).toLocaleString("es-ES")}
                    </p>
                    <p>{c.texto}</p>
                  </div>
                  <Button size="sm" variant="ghost" onPress={() => handleDeleteComentario(c.id)}>
                    Eliminar
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr]">
            <SelectField label="Autor" options={personas.map((p) => ({ id: p.id, label: p.nombre }))} value={autorComentario} onChange={setAutorComentario} />
            <TextField value={nuevoComentario} onChange={setNuevoComentario}>
              <Label>Comentario</Label>
              <TextArea placeholder="Escribe un comentario sobre esta tarea..." rows={2} />
            </TextField>
          </div>
          <div className="flex justify-end">
            <Button isDisabled={!autorComentario || !nuevoComentario.trim()} size="sm" onPress={handleAddComentario}>
              Añadir comentario
            </Button>
          </div>
        </div>
      ) : null}
    </FormModal>
  );
}
