import { useEffect, useState } from "react";
import { capacidadApi } from "../lib/api";
import { formatFecha } from "../lib/format";
import type { Ausencia } from "../types";

// Aviso (no bloqueante) cuando la persona tiene vacaciones o festivos dentro del periodo
// planificado para una tarea.
export function AusenciasAviso({ personaId, nombre, desde, hasta }: { personaId: string | null; nombre?: string; desde: string; hasta: string }) {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const inicio = desde || hasta;
  const fin = hasta || desde;

  useEffect(() => {
    if (!personaId || !inicio) {
      setAusencias([]);
      return;
    }
    let vigente = true;
    const t = setTimeout(() => {
      capacidadApi
        .ausencias(personaId, inicio, fin)
        .then((r) => vigente && setAusencias(r.data))
        .catch(() => vigente && setAusencias([]));
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [personaId, inicio, fin]);

  if (!personaId || !inicio || ausencias.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-warning/40 bg-warning-soft/40 px-3 py-2 text-sm">
      <p className="font-medium text-warning">
        ⚠ {nombre ?? "El responsable"} no está disponible algunos días de este periodo
      </p>
      <ul className="text-xs text-muted">
        {ausencias.map((a) => (
          <li key={`${a.tipo}-${a.fechaInicio}-${a.detalle}`}>
            {a.tipo === "Festivo" ? "Festivo" : "Vacaciones"}: {a.detalle} ·{" "}
            {a.fechaInicio === a.fechaFin ? formatFecha(a.fechaInicio) : `${formatFecha(a.fechaInicio)} → ${formatFecha(a.fechaFin)}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
