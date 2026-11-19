import { Spinner } from "@heroui/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { tareasApi } from "../lib/api";
import { ESTADO_TAREA_LABEL, formatFecha, PRIORIDAD_LABEL, TIPO_TAREA_LABEL } from "../lib/format";
import type { EstadoTarea, Prioridad, TareaCambio, TipoTarea } from "../types";

const CAMPO_LABEL: Record<string, string> = {
  Titulo: "Título",
  Estado: "Estado",
  Prioridad: "Prioridad",
  Tipo: "Tipo",
  ResponsableId: "Responsable",
  ProyectoId: "Proyecto",
  EstimacionHoras: "Estimación",
  FechaInicio: "Fecha de inicio",
  FechaObjetivo: "Fecha objetivo",
  FechaCierre: "Fecha de cierre",
  MotivoBloqueo: "Motivo del bloqueo",
};

// Convierte el valor guardado en el historial a un texto legible según el campo.
function valor(campo: string, v: string | null): string {
  if (v === null || v === "") return "—";
  switch (campo) {
    case "Estado":
    case "Creada":
    case "HistorialIniciado":
      return ESTADO_TAREA_LABEL[v as EstadoTarea] ?? v;
    case "Prioridad":
      return PRIORIDAD_LABEL[v as Prioridad] ?? v;
    case "Tipo":
      return TIPO_TAREA_LABEL[v as TipoTarea] ?? v;
    case "FechaInicio":
    case "FechaObjetivo":
    case "FechaCierre":
      return formatFecha(v);
    case "EstimacionHoras":
      return `${v.replace(".", ",")} h`;
    default:
      return v;
  }
}

function Linea({ c }: { c: TareaCambio }) {
  if (c.campo === "Creada")
    return (
      <>
        <span className="font-medium text-foreground">Tarea creada</span> en estado {valor("Estado", c.valorNuevo)}
      </>
    );
  if (c.campo === "HistorialIniciado")
    return <span className="text-muted">Inicio del historial · estado en ese momento: {valor("Estado", c.valorNuevo)}</span>;
  return (
    <>
      <span className="font-medium text-foreground">{CAMPO_LABEL[c.campo] ?? c.campo}</span>:{" "}
      <span className="text-muted line-through decoration-muted/50">{valor(c.campo, c.valorAnterior)}</span> →{" "}
      <span className="text-foreground">{valor(c.campo, c.valorNuevo)}</span>
    </>
  );
}

// Línea de actividad de una tarea: cambios agrupados por momento (un guardado puede cambiar varios campos).
export function TareaHistorialPanel({ tareaId }: { tareaId: string }) {
  const [cambios, setCambios] = useState<TareaCambio[] | null>(null);

  useEffect(() => {
    let vigente = true;
    tareasApi.historial(tareaId).then((r) => vigente && setCambios(r.data));
    return () => {
      vigente = false;
    };
  }, [tareaId]);

  if (!cambios)
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  if (cambios.length === 0) return <p className="text-sm text-muted">Sin cambios registrados.</p>;

  const grupos: { fecha: string; usuario: string; cambios: TareaCambio[] }[] = [];
  for (const c of cambios) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.fecha === c.fecha && ultimo.usuario === c.usuario) ultimo.cambios.push(c);
    else grupos.push({ fecha: c.fecha, usuario: c.usuario, cambios: [c] });
  }

  return (
    <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
      {grupos.map((g) => (
        <li key={`${g.fecha}-${g.usuario}`} className="relative">
          <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-surface bg-accent" />
          <p className="text-xs text-muted">
            {format(new Date(g.fecha), "d MMM yyyy, HH:mm", { locale: es })} · {g.usuario}
          </p>
          <ul className="mt-1 flex flex-col gap-0.5 text-sm">
            {g.cambios.map((c) => (
              <li key={c.id}>
                <Linea c={c} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
