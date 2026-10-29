import { Card } from "@heroui/react";
import type { ReactNode } from "react";

type Tone = "default" | "danger" | "warning" | "success" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  default: "text-foreground",
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
  accent: "text-accent",
};

export function StatCard({
  label,
  value,
  tone = "default",
  icon,
  onClick,
}: {
  label: string;
  value: number | string;
  tone?: Tone;
  icon?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`w-full gap-2 ${onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        {icon ? <span className={TONE_CLASSES[tone]}>{icon}</span> : null}
      </div>
      <span className={`text-3xl font-semibold ${TONE_CLASSES[tone]}`}>{value}</span>
    </Card>
  );
}
