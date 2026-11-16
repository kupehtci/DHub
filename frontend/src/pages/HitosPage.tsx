import { Button, Checkbox, Input, Label, TextField } from "@heroui/react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DateRangeField } from "../components/DateRangeField";
import { HitoFormModal } from "../components/HitoFormModal";
import { IconPlus } from "../components/Icons";
import { PersonaAvatar } from "../components/PersonaAvatar";
import { SearchableSelect } from "../components/SearchableSelect";
import { SelectField } from "../components/SelectField";
import { StatusChip } from "../components/StatusChip";
import { equiposApi, hitosApi, proyectosApi } from "../lib/api";
import { ESTADO_HITO_COLOR, ESTADO_HITO_LABEL, ESTADO_PROYECTO_LABEL, formatFecha } from "../lib/format";
import type { Equipo, EstadoHito, HitoListado, Proyecto } from "../types";

const ESTADOS: EstadoHito[] = ["Pendiente", "EnRiesgo", "Retrasado", "Completado"];

// Texto relativo a hoy: "en 5 días", "hoy", "hace 3 días".
function plazo(fecha: string): { texto: string; dias: number } {
  const dias = differenceInCalendarDays(parseISO(fecha), new Date());
  if (dias === 0) return { texto: "Hoy", dias };
  if (dias === 1) return { texto: "Mañana", dias };
  if (dias > 0) return { texto: `En ${dias} días`, dias };
  return { texto: `Hace ${-dias} día${dias === -1 ? "" : "s"}`, dias };
}

export default function HitosPage() {
  const [hitos, setHitos] = useState<HitoListado[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState<string | null>(null);
  const [filtroEquipo, setFiltroEquipo] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [ocultarCompletados, setOcultarCompletados] = useState(false);

  const [modal, setModal] = useState<{ open: boolean; hito: HitoListado | null }>({ open: false, hito: null });

  const cargar = () => {
    setLoading(true);
    hitosApi
      .listar({
        q: q || undefined,
        proyectoId: filtroProyecto ?? undefined,
        equipoId: filtroEquipo ?? undefined,
        estado: filtroEstado ?? undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      })
      .then((r) => setHitos(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    proyectosApi.listar().then((r) => setProyectos(r.data));
    equiposApi.listar().then((r) => setEquipos(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filtroProyecto, filtroEquipo, filtroEstado, desde, hasta]);

  const visibles = useMemo(() => (ocultarCompletados ? hitos.filter((h) => h.estado !== "Completado") : hitos), [hitos, ocultarCompletados]);

  const resumen = useMemo(() => {
    const abiertos = hitos.filter((h) => h.estado !== "Completado");
    return {
      total: hitos.length,
      pasados: abiertos.filter((h) => plazo(h.fecha).dias < 0).length,
      proximos: abiertos.filter((h) => {
        const d = plazo(h.fecha).dias;
        return d >= 0 && d <= 14;
      }).length,
      completados: hitos.length - abiertos.length,
    };
  }, [hitos]);

  const proyectoOptions = useMemo(() => proyectos.map((p) => ({ id: p.id, label: `${p.codigo} · ${p.nombre}` })), [proyectos]);

  const cambiarEstado = async (h: HitoListado, estado: EstadoHito) => {
    await hitosApi.actualizar(h.id, { nombre: h.nombre, fecha: h.fecha, estado, descripcion: h.descripcion });
    cargar();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hitos</h1>
          <p className="text-sm text-muted">Todos los hitos de todos los proyectos, ordenados por fecha.</p>
        </div>
        <Button onPress={() => setModal({ open: true, hito: null })}>
          <IconPlus />
          Nuevo hito
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-surface-secondary px-3 py-1 text-muted">{resumen.total} hitos</span>
        <span className="rounded-full bg-danger-soft px-3 py-1 text-danger">{resumen.pasados} con fecha pasada sin completar</span>
        <span className="rounded-full bg-warning-soft px-3 py-1 text-warning">{resumen.proximos} en los próximos 14 días</span>
        <span className="rounded-full bg-success-soft px-3 py-1 text-success">{resumen.completados} completados</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <TextField value={q} onChange={setQ}>
            <Label>Buscar</Label>
            <Input placeholder="Nombre o descripción..." />
          </TextField>
        </div>
        <div className="w-64">
          <SearchableSelect label="Proyecto" options={proyectoOptions} value={filtroProyecto} onChange={setFiltroProyecto} placeholder="Todos los proyectos" />
        </div>
        <div className="w-52">
          <SearchableSelect label="Equipo" options={equipos.map((e) => ({ id: e.id, label: e.nombre }))} value={filtroEquipo} onChange={setFiltroEquipo} placeholder="Todos los equipos" />
        </div>
        <div className="w-44">
          <SelectField emptyOption="Todos" label="Estado" options={ESTADOS.map((e) => ({ id: e, label: ESTADO_HITO_LABEL[e] }))} value={filtroEstado} onChange={setFiltroEstado} />
        </div>
        <div className="w-72">
          <DateRangeField label="Fechas" start={desde} end={hasta} onChange={(a, b) => (setDesde(a), setHasta(b))} />
        </div>
        <Checkbox isSelected={ocultarCompletados} onChange={setOcultarCompletados} className="pb-2">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Ocultar completados
          </Checkbox.Content>
        </Checkbox>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Hito</th>
              <th className="px-4 py-3 font-medium">Proyecto</th>
              <th className="px-4 py-3 font-medium">Equipo</th>
              <th className="px-4 py-3 font-medium">Responsable del proyecto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={6}>
                  Cargando...
                </td>
              </tr>
            ) : visibles.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={6}>
                  No hay hitos para este filtro.
                </td>
              </tr>
            ) : (
              visibles.map((h) => {
                const p = plazo(h.fecha);
                const pendiente = h.estado !== "Completado";
                const tono = !pendiente ? "text-muted" : p.dias < 0 ? "text-danger" : p.dias <= 7 ? "text-warning" : "text-muted";
                return (
                  <tr
                    key={h.id}
                    onClick={() => setModal({ open: true, hito: h })}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-secondary"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-medium text-foreground">{formatFecha(h.fecha)}</p>
                      <p className={`text-xs ${tono}`}>{p.texto}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[300px] truncate font-medium text-foreground">{h.nombre}</p>
                      {h.descripcion ? (
                        <p className="max-w-[300px] truncate text-xs text-muted" title={h.descripcion}>
                          {h.descripcion}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/proyectos/${h.proyectoId}`} className="hover:underline">
                        <span className="font-medium text-foreground">{h.proyectoCodigo}</span>
                        <span className="block max-w-[220px] truncate text-xs text-muted">
                          {h.proyectoNombre} · {ESTADO_PROYECTO_LABEL[h.proyectoEstado]}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{h.equipoNombre ?? "—"}</td>
                    <td className="px-4 py-3">
                      {h.responsableId ? (
                        <span className="flex items-center gap-1.5">
                          <PersonaAvatar id={h.responsableId} nombre={h.responsableNombre ?? ""} size="sm" />
                          {h.responsableNombre}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <StatusChip color={ESTADO_HITO_COLOR[h.estado]} label={ESTADO_HITO_LABEL[h.estado]} />
                        {pendiente ? (
                          <Button size="sm" variant="ghost" onPress={() => cambiarEstado(h, "Completado")}>
                            Completar
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onPress={() => cambiarEstado(h, "Pendiente")}>
                            Reabrir
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <HitoFormModal
        isOpen={modal.open}
        onOpenChange={(open) => setModal((s) => ({ ...s, open }))}
        hito={modal.hito}
        proyectos={proyectos}
        defaultProyectoId={filtroProyecto}
        onSaved={cargar}
      />
    </div>
  );
}
