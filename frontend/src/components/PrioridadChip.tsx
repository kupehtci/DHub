import { Chip } from "@heroui/react";
import { PRIORIDAD_LABEL } from "../lib/format";
import type { Prioridad } from "../types";

// Crítica se pinta en rojo sólido (variante "primary") para que destaque sobre el resto;
// el resto de prioridades reutiliza los tokens semánticos existentes en variante "soft".
const VARIANT: Record<Prioridad, "primary" | "soft"> = {
  Baja: "soft",
  Media: "soft",
  Alta: "soft",
  Critica: "primary",
};

const COLOR: Record<Prioridad, "success" | "warning" | "danger"> = {
  Baja: "success",
  Media: "warning",
  Alta: "danger",
  Critica: "danger",
};

export function PrioridadChip({ prioridad, size = "sm" }: { prioridad: Prioridad; size?: "sm" | "md" | "lg" }) {
  return (
    <Chip color={COLOR[prioridad]} size={size} variant={VARIANT[prioridad]}>
      <Chip.Label>{PRIORIDAD_LABEL[prioridad]}</Chip.Label>
    </Chip>
  );
}
