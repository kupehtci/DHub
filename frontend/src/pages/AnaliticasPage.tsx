import { Button, Card, Spinner } from "@heroui/react";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { personasApi, proyectosApi, riesgosApi, tareasApi } from "../lib/api";
import {
  CHART_COLORS,
  CHIP_COLOR_TO_CHART,
  ESTADO_TAREA_LABEL,
  IMPACTO_LABEL,
  PRIORIDAD_LABEL,
  ESTADO_TAREA_COLOR,
  IMPACTO_COLOR,
  PRIORIDAD_CHART_COLOR,
} from "../lib/format";
import { ESTADOS_TAREA, type ImpactoRiesgo, type Persona, type Prioridad, type Proyecto, type Riesgo, type Tarea } from "../types";

type Granularidad = "semana" | "mes" | "año";

const axisTick = { fill: "var(--muted)", fontSize: 12 };
const tooltipStyle = {
  contentStyle: { backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 },
  labelStyle: { color: "var(--foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--foreground)" },
};

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3">
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        {description ? <Card.Description>{description}</Card.Description> : null}
      </Card.Header>
      <Card.Content>
        <div className="h-72 w-full">{children}</div>
      </Card.Content>
    </Card>
  );
}

function buildTendencia(tareas: Tarea[], granularidad: Granularidad) {
  const hechas = tareas.filter((t) => t.estado === "Hecha" && t.fechaCierre);
  const ahora = new Date();
  const periodos: { label: string; inicio: Date; fin: Date }[] = [];

  if (granularidad === "semana") {
    for (let i = 11; i >= 0; i--) {
      const inicio = startOfWeek(subWeeks(ahora, i), { weekStartsOn: 1 });
      periodos.push({ label: format(inicio, "dd MMM", { locale: es }), inicio, fin: endOfWeek(inicio, { weekStartsOn: 1 }) });
    }
  } else if (granularidad === "mes") {
    for (let i = 11; i >= 0; i--) {
      const inicio = startOfMonth(subMonths(ahora, i));
      periodos.push({ label: format(inicio, "MMM yy", { locale: es }), inicio, fin: endOfMonth(inicio) });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const inicio = startOfYear(subYears(ahora, i));
      periodos.push({ label: format(inicio, "yyyy"), inicio, fin: endOfYear(inicio) });
    }
  }

  return periodos.map((p) => ({
    label: p.label,
    completadas: hechas.filter((t) => {
      const d = new Date(t.fechaCierre!);
      return d >= p.inicio && d <= p.fin;
    }).length,
  }));
}

export default function AnaliticasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularidad, setGranularidad] = useState<Granularidad>("semana");

  useEffect(() => {
    setLoading(true);
    Promise.all([tareasApi.listar(), personasApi.listar(), riesgosApi.listar(), proyectosApi.listar()])
      .then(([t, p, r, pr]) => {
        setTareas(t.data);
        setPersonas(p.data);
        setRiesgos(r.data);
        setProyectos(pr.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const tareasPorPersona = useMemo(() => {
    const sinAsignar = tareas.filter((t) => !t.responsableId).length;
    const porPersona = personas
      .map((p) => ({ nombre: p.nombre, cantidad: tareas.filter((t) => t.responsableId === p.id).length }))
      .filter((p) => p.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad);
    return sinAsignar > 0 ? [...porPersona, { nombre: "Sin asignar", cantidad: sinAsignar }] : porPersona;
  }, [tareas, personas]);

  const tendencia = useMemo(() => buildTendencia(tareas, granularidad), [tareas, granularidad]);

  const porEstado = useMemo(
    () => ESTADOS_TAREA.map((e) => ({ estado: ESTADO_TAREA_LABEL[e], cantidad: tareas.filter((t) => t.estado === e).length, color: CHIP_COLOR_TO_CHART[ESTADO_TAREA_COLOR[e]] })).filter((e) => e.cantidad > 0),
    [tareas],
  );

  const porPrioridad = useMemo(() => {
    const prioridades: Prioridad[] = ["Baja", "Media", "Alta", "Critica"];
    return prioridades.map((p) => ({ prioridad: PRIORIDAD_LABEL[p], cantidad: tareas.filter((t) => t.prioridad === p).length, color: PRIORIDAD_CHART_COLOR[p] }));
  }, [tareas]);

  const riesgosPorImpacto = useMemo(() => {
    const impactos: ImpactoRiesgo[] = ["Bajo", "Medio", "Alto", "Critico"];
    return impactos.map((i) => ({ impacto: IMPACTO_LABEL[i], cantidad: riesgos.filter((r) => r.impacto === i).length, color: CHIP_COLOR_TO_CHART[IMPACTO_COLOR[i]] }));
  }, [riesgos]);

  const cargaPorPersona = useMemo(
    () =>
      personas
        .map((p) => ({ nombre: p.nombre, carga: p.cargaHoras, disponibilidad: p.disponibilidadSemanalHoras }))
        .sort((a, b) => b.carga - a.carga)
        .slice(0, 10),
    [personas],
  );

  const tareasPorProyecto = useMemo(
    () => proyectos.map((p) => ({ nombre: p.codigo, cantidad: p.tareasTotal })).sort((a, b) => b.cantidad - a.cantidad),
    [proyectos],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Analíticas</h1>
        <p className="text-sm text-muted">Carga de trabajo, avance y riesgos del conjunto de proyectos.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard description="Número de tareas asignadas a cada persona" title="Tareas por persona">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={tareasPorPersona} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis allowDecimals={false} axisLine={{ stroke: "var(--border)" }} tick={axisTick} tickLine={false} type="number" />
              <YAxis axisLine={false} dataKey="nombre" tick={axisTick} tickLine={false} type="category" width={110} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-secondary)" }} />
              <Bar dataKey="cantidad" fill={CHART_COLORS.accent} name="Tareas" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard description="Tareas cerradas (estado Hecha) por fecha de cierre" title="Tendencia de tareas completadas">
          <div className="mb-2 flex justify-end gap-1">
            {(["semana", "mes", "año"] as Granularidad[]).map((g) => (
              <Button key={g} size="sm" variant={granularidad === g ? "primary" : "secondary"} onPress={() => setGranularidad(g)}>
                {g === "semana" ? "Semana" : g === "mes" ? "Mes" : "Año"}
              </Button>
            ))}
          </div>
          <ResponsiveContainer height="85%" width="100%">
            <BarChart data={tendencia}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="label" tick={axisTick} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-secondary)" }} />
              <Bar dataKey="completadas" fill={CHART_COLORS.success} name="Completadas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard description="Distribución de todas las tareas por estado" title="Tareas por estado">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie data={porEstado} dataKey="cantidad" innerRadius={55} nameKey="estado" outerRadius={90} paddingAngle={2}>
                {porEstado.map((entry) => (
                  <Cell key={entry.estado} fill={entry.color} stroke="var(--surface)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard description="Distribución de todas las tareas por prioridad" title="Tareas por prioridad">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={porPrioridad}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="prioridad" tick={axisTick} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-secondary)" }} />
              <Bar dataKey="cantidad" name="Tareas" radius={[4, 4, 0, 0]}>
                {porPrioridad.map((entry) => (
                  <Cell key={entry.prioridad} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard description="Riesgos y bloqueos abiertos por nivel de impacto" title="Riesgos por impacto">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={riesgosPorImpacto}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="impacto" tick={axisTick} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-secondary)" }} />
              <Bar dataKey="cantidad" name="Riesgos" radius={[4, 4, 0, 0]}>
                {riesgosPorImpacto.map((entry) => (
                  <Cell key={entry.impacto} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard description="Top 10 personas por carga de tareas activas, frente a su disponibilidad semanal" title="Carga vs. disponibilidad">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={cargaPorPersona}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="nombre" interval={0} tick={{ ...axisTick, fontSize: 10 }} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-secondary)" }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
              <Bar dataKey="carga" fill={CHART_COLORS.accent} name="Carga (h)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="disponibilidad" fill={CHART_COLORS.muted} name="Disponibilidad (h)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard description="Número de tareas registradas en cada proyecto" title="Tareas por proyecto">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={tareasPorProyecto}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis axisLine={{ stroke: "var(--border)" }} dataKey="nombre" tick={axisTick} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tick={axisTick} tickLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface-secondary)" }} />
              <Bar dataKey="cantidad" fill={CHART_COLORS.accent} name="Tareas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
