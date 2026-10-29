import { Avatar } from "@heroui/react";

const PALETTE = [
  "#F43F5E",
  "#F97316",
  "#EAB308",
  "#84CC16",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#D946EF",
  "#EC4899",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function colorForId(id: string): string {
  return PALETTE[hashString(id) % PALETTE.length];
}

export function initialsFor(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return `${palabras[0][0]}${palabras[palabras.length - 1][0]}`.toUpperCase();
}

export function PersonaAvatar({
  id,
  nombre,
  size = "md",
  className,
}: {
  id: string;
  nombre: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const bg = colorForId(id);
  return (
    <Avatar aria-label={nombre} className={className} size={size}>
      <Avatar.Fallback
        className="font-semibold text-white"
        style={{ backgroundColor: bg }}
      >
        {initialsFor(nombre)}
      </Avatar.Fallback>
    </Avatar>
  );
}
