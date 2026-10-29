import { Card, Spinner } from "@heroui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SelectField } from "../components/SelectField";
import { StatCard } from "../components/StatCard";
import { StatusChip } from "../components/StatusChip";
import { PrioridadChip } from "../components/PrioridadChip";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { IconFolder, IconUsers, IconWarning } from "../components/Icons";
import { dashboardApi, equiposApi } from "../lib/api";
import {
  ESTADO_HITO_COLOR,
  ESTADO_HITO_LABEL,
  ESTADO_PROYECTO_COLOR,
  ESTADO_PROYECTO_LABEL,
  formatFecha,
  IMPACTO_COLOR,
  IMPACTO_LABEL,
} from "../lib/format";
import type { Dashboard, Equipo } from "../types";

export default function DashboardPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoId, setEquipoId] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    equiposApi.listar().then((r) => setEquipos(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .obtener({ equipoId: equipoId ?? undefined })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [equipoId]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">Estado general de proyectos, tareas y riesgos.</p>
        </div>
        <div className="w-64">
          <SelectField
            emptyOption="Todos los equipos"
            label="Equipo"
            options={equipos.map((e) => ({ id: e.id, label: e.nombre }))}
            value={equipoId}
            onChange={setEquipoId}
          />
        </div>
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Proyectos activos" value={data.proyectosActivos} tone="accent" icon={<IconFolder />} />
            <StatCard label="Proyectos en riesgo" value={data.proyectosEnRiesgo} tone="warning" icon={<IconWarning />} />
            <StatCard label="Tareas vencidas" value={data.tareasVencidas} tone="danger" />
            <StatCard label="Tareas bloqueadas" value={data.tareasBloqueadas} tone="danger" />
            <StatCard label="Sin responsable" value={data.tareasSinResponsable} tone="warning" icon={<IconUsers />} />
            <StatCard label="Riesgos altos/críticos" value={data.riesgosAltos} tone="danger" icon={<IconWarning />} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="gap-3">
              <Card.Header>
                <Card.Title>Proyectos</Card.Title>
                <Card.Description>Estado de los proyectos del alcance seleccionado</Card.Description>
              </Card.Header>
              <Card.Content className="flex flex-col gap-2">
                {data.proyectos.length === 0 ? (
                  <p className="text-sm text-muted">No hay proyectos para este filtro.</p>
                ) : (
                  data.proyectos.map((p) => (
                    <Link
                      key={p.id}
                      to={`/proyectos/${p.id}`}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {p.codigo} · {p.nombre}
                        </p>
                        <p className="text-xs text-muted">{p.equipoNombre ?? "Sin equipo"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PrioridadChip prioridad={p.prioridad} />
                        <StatusChip color={ESTADO_PROYECTO_COLOR[p.estado]} label={ESTADO_PROYECTO_LABEL[p.estado]} />
                      </div>
                    </Link>
                  ))
                )}
              </Card.Content>
            </Card>

            <Card className="gap-3">
              <Card.Header>
                <Card.Title>Próximos hitos</Card.Title>
                <Card.Description>Próximos 30 días</Card.Description>
              </Card.Header>
              <Card.Content className="flex flex-col gap-2">
                {data.proximosHitos.length === 0 ? (
                  <p className="text-sm text-muted">No hay hitos próximos.</p>
                ) : (
                  data.proximosHitos.map((h) => (
                    <div key={h.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{h.nombre}</p>
                        <p className="text-xs text-muted">{formatFecha(h.fecha)}</p>
                      </div>
                      <StatusChip color={ESTADO_HITO_COLOR[h.estado]} label={ESTADO_HITO_LABEL[h.estado]} />
                    </div>
                  ))
                )}
              </Card.Content>
            </Card>

            <Card className="gap-3">
              <Card.Header>
                <Card.Title>Tareas vencidas</Card.Title>
              </Card.Header>
              <Card.Content className="flex flex-col gap-2">
                {data.tareasVencidasList.length === 0 ? (
                  <p className="text-sm text-muted">Sin tareas vencidas. 🎉</p>
                ) : (
                  data.tareasVencidasList.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-danger/20 bg-danger-soft/40 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{t.titulo}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted">
                          {t.proyectoCodigo} ·
                          {t.responsableId ? <PersonaAvatar id={t.responsableId} nombre={t.responsableNombre ?? ""} size="sm" /> : null}
                          {t.responsableNombre ?? "Sin responsable"} · objetivo {formatFecha(t.fechaObjetivo)}
                        </p>
                      </div>
                      <PrioridadChip prioridad={t.prioridad} />
                    </div>
                  ))
                )}
              </Card.Content>
            </Card>

            <Card className="gap-3">
              <Card.Header>
                <Card.Title>Riesgos altos y críticos</Card.Title>
              </Card.Header>
              <Card.Content className="flex flex-col gap-2">
                {data.riesgosAltosList.length === 0 ? (
                  <p className="text-sm text-muted">Sin riesgos altos abiertos.</p>
                ) : (
                  data.riesgosAltosList.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{r.titulo}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted">
                          {r.proyectoNombre ?? "—"} ·
                          {r.responsableId ? <PersonaAvatar id={r.responsableId} nombre={r.responsableNombre ?? ""} size="sm" /> : null}
                          {r.responsableNombre ?? "Sin responsable"}
                        </p>
                      </div>
                      <StatusChip color={IMPACTO_COLOR[r.impacto]} label={IMPACTO_LABEL[r.impacto]} />
                    </div>
                  ))
                )}
              </Card.Content>
            </Card>
          </div>

          <Card className="gap-3">
            <Card.Header>
              <Card.Title>Tareas bloqueadas y sin responsable</Card.Title>
            </Card.Header>
            <Card.Content className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {[...data.tareasBloqueadasList, ...data.tareasSinResponsableList].length === 0 ? (
                <p className="text-sm text-muted">Nada que destacar.</p>
              ) : (
                [...data.tareasBloqueadasList, ...data.tareasSinResponsableList].map((t) => (
                  <Link
                    key={t.id}
                    to={`/proyectos/${t.proyectoId}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{t.titulo}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted">
                        {t.proyectoCodigo} ·
                        {t.responsableId ? <PersonaAvatar id={t.responsableId} nombre={t.responsableNombre ?? ""} size="sm" /> : null}
                        {t.responsableNombre ?? "Sin responsable"}
                      </p>
                      {t.estado === "Bloqueada" && t.motivoBloqueo ? (
                        <p className="truncate text-xs text-danger" title={t.motivoBloqueo}>
                          Motivo: {t.motivoBloqueo}
                        </p>
                      ) : null}
                    </div>
                    {t.estado === "Bloqueada" ? (
                      <StatusChip color="danger" label="Bloqueada" />
                    ) : (
                      <StatusChip color="warning" label="Sin responsable" />
                    )}
                  </Link>
                ))
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </div>
  );
}
