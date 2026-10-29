import { Button, Input, Label, Spinner, Tabs, TextArea, TextField } from "@heroui/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FormModal } from "../components/FormModal";
import { IconPlus } from "../components/Icons";
import { RiesgoFormModal } from "../components/RiesgoFormModal";
import { SelectField } from "../components/SelectField";
import { StatusChip } from "../components/StatusChip";
import { PrioridadChip } from "../components/PrioridadChip";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { TareaFormModal } from "../components/TareaFormModal";
import { hitosApi, notasApi, personasApi, proyectosApi, tareasApi } from "../lib/api";
import {
  ESTADO_HITO_COLOR,
  ESTADO_HITO_LABEL,
  ESTADO_PROYECTO_COLOR,
  ESTADO_PROYECTO_LABEL,
  ESTADO_RIESGO_COLOR,
  ESTADO_RIESGO_LABEL,
  ESTADO_TAREA_COLOR,
  ESTADO_TAREA_LABEL,
  formatFecha,
  formatHoras,
  IMPACTO_COLOR,
  IMPACTO_LABEL,
  TIPO_NOTA_LABEL,
} from "../lib/format";
import type { EstadoHito, Nota, Persona, ProyectoDetalle, Riesgo, Tarea, TipoNota } from "../types";

const hoyIso = () => new Date().toISOString().slice(0, 10);

export default function ProyectoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [proyecto, setProyecto] = useState<ProyectoDetalle | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("resumen");

  const [tareaModal, setTareaModal] = useState<{ open: boolean; tarea: Tarea | null }>({ open: false, tarea: null });
  const [riesgoModal, setRiesgoModal] = useState<{ open: boolean; riesgo: Riesgo | null }>({ open: false, riesgo: null });
  const [hitoModalOpen, setHitoModalOpen] = useState(false);
  const [hitoForm, setHitoForm] = useState({ nombre: "", fecha: hoyIso(), estado: "Pendiente" as EstadoHito, descripcion: "" });
  const [notaForm, setNotaForm] = useState({ autorId: null as string | null, tipo: "Seguimiento" as TipoNota, texto: "" });
  const [deleteTarea, setDeleteTarea] = useState<Tarea | null>(null);

  const cargar = () => {
    if (!id) return;
    setLoading(true);
    proyectosApi.obtener(id).then((r) => setProyecto(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    personasApi.listar().then((r) => setPersonas(r.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCreateHito = async () => {
    if (!id) return;
    await proyectosApi.crearHito(id, hitoForm);
    setHitoModalOpen(false);
    setHitoForm({ nombre: "", fecha: hoyIso(), estado: "Pendiente", descripcion: "" });
    cargar();
  };

  const handleHitoEstado = async (hitoId: string, estado: EstadoHito) => {
    await hitosApi.actualizar(hitoId, { estado });
    cargar();
  };

  const handleDeleteHito = async (hitoId: string) => {
    await hitosApi.eliminar(hitoId);
    cargar();
  };

  const handleCrearNota = async () => {
    const { autorId, tipo, texto } = notaForm;
    if (!id || !autorId || !texto) return;
    await notasApi.crear({ autorId, tipo, texto, proyectoId: id });
    setNotaForm({ autorId, tipo: "Seguimiento", texto: "" });
    cargar();
  };

  const handleEliminarNota = async (notaId: string) => {
    await notasApi.eliminar(notaId);
    cargar();
  };

  const handleDeleteTarea = async () => {
    if (!deleteTarea) return;
    await tareasApi.eliminar(deleteTarea.id);
    setDeleteTarea(null);
    cargar();
  };

  if (loading || !proyecto) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const tareasBloqueadas = proyecto.tareas.filter((t) => t.estado === "Bloqueada");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {proyecto.codigo} · {proyecto.nombre}
          </h1>
          <p className="text-sm text-muted">
            {proyecto.sistemaInformacion} · {proyecto.clienteArea}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            {proyecto.equipoNombre ?? "Sin equipo"} · Responsable:
            {proyecto.responsableId ? <PersonaAvatar id={proyecto.responsableId} nombre={proyecto.responsableNombre ?? ""} size="sm" /> : null}
            {proyecto.responsableNombre ?? "Sin responsable"} ·{" "}
            {formatFecha(proyecto.fechaInicio)} → {formatFecha(proyecto.fechaFin)}
          </p>
          {proyecto.jiraProyectoUrl ? (
            <a className="text-xs text-link hover:underline" href={proyecto.jiraProyectoUrl} rel="noreferrer" target="_blank">
              Ver tablero en Jira{proyecto.jiraClaveProyecto ? ` (${proyecto.jiraClaveProyecto})` : ""} →
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <PrioridadChip prioridad={proyecto.prioridad} />
          <StatusChip color={ESTADO_PROYECTO_COLOR[proyecto.estado]} label={ESTADO_PROYECTO_LABEL[proyecto.estado]} />
        </div>
      </div>

      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k))}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Secciones del proyecto">
            <Tabs.Tab id="resumen">
              Resumen
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="tareas">
              Tareas ({proyecto.tareas.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="hitos">
              Hitos ({proyecto.hitos.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="riesgos">
              Riesgos ({proyecto.riesgos.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="notas">
              Notas ({proyecto.notas.length})
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="pt-4" id="resumen">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-xs text-muted">Tareas totales</p>
              <p className="text-xl font-semibold">{proyecto.tareas.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-xs text-muted">Vencidas</p>
              <p className="text-xl font-semibold text-danger">{proyecto.tareas.filter((t) => t.estaVencida).length}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-xs text-muted">Bloqueadas</p>
              <p className="text-xl font-semibold text-danger">{proyecto.tareas.filter((t) => t.estado === "Bloqueada").length}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-xs text-muted">Riesgos altos</p>
              <p className="text-xl font-semibold text-warning">
                {proyecto.riesgos.filter((r) => r.impacto === "Alto" || r.impacto === "Critico").length}
              </p>
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="flex flex-col gap-3 pt-4" id="tareas">
          <div className="flex justify-end">
            <Button onPress={() => setTareaModal({ open: true, tarea: null })}>
              <IconPlus />
              Nueva tarea
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {proyecto.tareas.length === 0 ? (
              <p className="text-sm text-muted">Este proyecto no tiene tareas todavía.</p>
            ) : (
              proyecto.tareas.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{t.titulo}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {t.responsableId ? <PersonaAvatar id={t.responsableId} nombre={t.responsableNombre ?? ""} size="sm" /> : null}
                      {t.responsableNombre ?? "Sin responsable"} · {formatHoras(t.estimacionHoras)} · objetivo {formatFecha(t.fechaObjetivo)}
                      {t.jiraTicketUrl ? (
                        <>
                          {" · "}
                          <a className="text-link hover:underline" href={t.jiraTicketUrl} rel="noreferrer" target="_blank">
                            {t.jiraTicketClave ?? "Jira"} ↗
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PrioridadChip prioridad={t.prioridad} />
                    <StatusChip color={ESTADO_TAREA_COLOR[t.estado]} label={ESTADO_TAREA_LABEL[t.estado]} />
                    <Button size="sm" variant="ghost" onPress={() => setTareaModal({ open: true, tarea: t })}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onPress={() => setDeleteTarea(t)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="flex flex-col gap-3 pt-4" id="hitos">
          <div className="flex justify-end">
            <Button onPress={() => setHitoModalOpen(true)}>
              <IconPlus />
              Nuevo hito
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {proyecto.hitos.length === 0 ? (
              <p className="text-sm text-muted">Sin hitos registrados.</p>
            ) : (
              proyecto.hitos.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{h.nombre}</p>
                    <p className="text-xs text-muted">{formatFecha(h.fecha)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-44">
                      <SelectField
                        label=""
                        options={(["Pendiente", "EnRiesgo", "Completado", "Retrasado"] as EstadoHito[]).map((e) => ({ id: e, label: ESTADO_HITO_LABEL[e] }))}
                        value={h.estado}
                        onChange={(v) => v && handleHitoEstado(h.id, v as EstadoHito)}
                      />
                    </div>
                    <StatusChip color={ESTADO_HITO_COLOR[h.estado]} label={ESTADO_HITO_LABEL[h.estado]} />
                    <Button size="sm" variant="ghost" onPress={() => handleDeleteHito(h.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="flex flex-col gap-3 pt-4" id="riesgos">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Tareas bloqueadas</p>
            {tareasBloqueadas.length === 0 ? (
              <p className="text-sm text-muted">No hay tareas bloqueadas en este proyecto.</p>
            ) : (
              tareasBloqueadas.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft/30 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{t.titulo}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {t.responsableId ? <PersonaAvatar id={t.responsableId} nombre={t.responsableNombre ?? ""} size="sm" /> : null}
                      {t.responsableNombre ?? "Sin responsable"} · revisión {formatFecha(t.fechaRevisionBloqueo)}
                      {t.responsableBloqueoNombre ? ` · desbloquea: ${t.responsableBloqueoNombre}` : ""}
                    </p>
                    {t.motivoBloqueo ? <p className="truncate text-xs text-danger">Motivo: {t.motivoBloqueo}</p> : null}
                  </div>
                  <Button size="sm" variant="ghost" onPress={() => setTareaModal({ open: true, tarea: t })}>
                    Editar
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-medium text-foreground">Riesgos</p>
            <Button onPress={() => setRiesgoModal({ open: true, riesgo: null })}>
              <IconPlus />
              Nuevo riesgo / bloqueo
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {proyecto.riesgos.length === 0 ? (
              <p className="text-sm text-muted">Sin riesgos ni bloqueos registrados.</p>
            ) : (
              proyecto.riesgos.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{r.titulo}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      {r.responsableId ? <PersonaAvatar id={r.responsableId} nombre={r.responsableNombre ?? ""} size="sm" /> : null}
                      {r.responsableNombre ?? "Sin responsable"} · revisión {formatFecha(r.fechaRevision)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusChip color={IMPACTO_COLOR[r.impacto]} label={IMPACTO_LABEL[r.impacto]} />
                    <StatusChip color={ESTADO_RIESGO_COLOR[r.estado]} label={ESTADO_RIESGO_LABEL[r.estado]} />
                    <Button size="sm" variant="ghost" onPress={() => setRiesgoModal({ open: true, riesgo: r })}>
                      Editar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="flex flex-col gap-3 pt-4" id="notas">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[200px_1fr]">
              <SelectField label="Autor" options={personas.map((p) => ({ id: p.id, label: p.nombre }))} value={notaForm.autorId} onChange={(v) => setNotaForm((f) => ({ ...f, autorId: v }))} />
              <SelectField
                label="Tipo"
                options={(["Seguimiento", "Decision", "Riesgo", "Bloqueo", "General"] as TipoNota[]).map((t) => ({ id: t, label: TIPO_NOTA_LABEL[t] }))}
                value={notaForm.tipo}
                onChange={(v) => setNotaForm((f) => ({ ...f, tipo: (v as TipoNota) ?? "Seguimiento" }))}
              />
            </div>
            <TextField value={notaForm.texto} onChange={(v) => setNotaForm((f) => ({ ...f, texto: v }))}>
              <Label>Nota de seguimiento</Label>
              <TextArea placeholder="Escribe una nota de seguimiento..." rows={2} />
            </TextField>
            <div className="flex justify-end">
              <Button isDisabled={!notaForm.autorId || !notaForm.texto} onPress={handleCrearNota}>
                Añadir nota
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {proyecto.notas.map((n: Nota) => (
              <div key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                <div>
                  <p className="text-xs text-muted">
                    {n.autorNombre} · {TIPO_NOTA_LABEL[n.tipo]} · {new Date(n.fecha).toLocaleString("es-ES")}
                  </p>
                  <p>{n.texto}</p>
                </div>
                <Button size="sm" variant="ghost" onPress={() => handleEliminarNota(n.id)}>
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        </Tabs.Panel>
      </Tabs>

      <TareaFormModal
        isOpen={tareaModal.open}
        onOpenChange={(open) => setTareaModal((s) => ({ ...s, open }))}
        tarea={tareaModal.tarea}
        proyectos={[proyecto]}
        personas={personas}
        defaultProyectoId={proyecto.id}
        onSaved={cargar}
      />
      <RiesgoFormModal
        isOpen={riesgoModal.open}
        onOpenChange={(open) => setRiesgoModal((s) => ({ ...s, open }))}
        riesgo={riesgoModal.riesgo}
        proyectos={[proyecto]}
        personas={personas}
        tareas={proyecto.tareas}
        defaultProyectoId={proyecto.id}
        onSaved={cargar}
      />

      <FormModal
        isOpen={hitoModalOpen}
        onOpenChange={setHitoModalOpen}
        title="Nuevo hito"
        footer={
          <>
            <Button slot="close" variant="secondary">
              Cancelar
            </Button>
            <Button onPress={handleCreateHito}>Guardar</Button>
          </>
        }
      >
        <TextField isRequired value={hitoForm.nombre} onChange={(v) => setHitoForm((f) => ({ ...f, nombre: v }))}>
          <Label>Nombre</Label>
          <Input placeholder="Entrega del módulo X" />
        </TextField>
        <TextField isRequired type="date" value={hitoForm.fecha} onChange={(v) => setHitoForm((f) => ({ ...f, fecha: v }))}>
          <Label>Fecha</Label>
          <Input />
        </TextField>
        <TextField value={hitoForm.descripcion} onChange={(v) => setHitoForm((f) => ({ ...f, descripcion: v }))}>
          <Label>Descripción</Label>
          <TextArea rows={2} />
        </TextField>
      </FormModal>

      <ConfirmDialog
        isOpen={!!deleteTarea}
        onOpenChange={(open) => !open && setDeleteTarea(null)}
        title="Eliminar tarea"
        description={`¿Seguro que quieres eliminar "${deleteTarea?.titulo}"?`}
        onConfirm={handleDeleteTarea}
      />
    </div>
  );
}
