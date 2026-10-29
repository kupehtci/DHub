import { Chip } from "@heroui/react";

type ChipColor = "default" | "accent" | "success" | "warning" | "danger";

export function StatusChip({ label, color = "default" }: { label: string; color?: ChipColor }) {
  return (
    <Chip color={color} size="sm" variant="soft">
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}
