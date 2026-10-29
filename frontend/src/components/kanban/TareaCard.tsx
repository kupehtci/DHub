import { Card } from "@heroui/react";
import { StatusChip } from "../StatusChip";
import { formatFecha, formatHoras, PRIORIDAD_COLOR, PRIORIDAD_LABEL } from "../../lib/format";
import type { Tarea } from "../../types";

export function TareaCard({ tarea, onClick, subtitle }: { tarea: Tarea; onClick?: () => void; subtitle?: string }) {
  return (
    <Card
      className={`w-full gap-1.5 p-3 ${onClick ? "cursor-pointer hover:shadow-md" : ""} ${tarea.estaVencida ? "border-danger/40" : ""}`}
      onClick={onClick}
    >
      <p className="text-sm font-medium leading-snug text-foreground">{tarea.titulo}</p>
      <p className="text-xs text-muted">{subtitle ?? `${tarea.proyectoCodigo} · ${tarea.responsableNombre ?? "Sin responsable"}`}</p>
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <StatusChip color={PRIORIDAD_COLOR[tarea.prioridad]} label={PRIORIDAD_LABEL[tarea.prioridad]} />
        {tarea.estaVencida ? <StatusChip color="danger" label="Vencida" /> : null}
        {tarea.fechaObjetivo ? <span className="text-[11px] text-muted">{formatFecha(tarea.fechaObjetivo)}</span> : null}
        {tarea.estimacionHoras ? <span className="text-[11px] text-muted">· {formatHoras(tarea.estimacionHoras)}</span> : null}
      </div>
    </Card>
  );
}
