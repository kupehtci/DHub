import { Fragment, type ReactNode } from "react";

export interface GanttLegendItem {
  key: string;
  label: string;
  // Muestra visual del elemento (cuadradito de color, borde discontinuo, línea…).
  swatch: ReactNode;
  title?: string;
}

export interface GanttLegendGroup {
  key: string;
  label?: string;
  items: GanttLegendItem[];
}

// Cuadradito de color para la leyenda.
export function LegendColor({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />;
}

// Flecha de conector para la leyenda: continua o discontinua, con color y grosor configurables.
export function LegendArrow({
  color = "var(--muted)",
  dashed,
  strokeWidth = 1.4,
  opacity = 1,
}: {
  color?: string;
  dashed?: boolean;
  strokeWidth?: number;
  opacity?: number;
}) {
  return (
    <svg width="18" height="8" aria-hidden style={{ opacity }}>
      <path d="M0,4 L12,4" stroke={color} strokeWidth={strokeWidth} strokeDasharray={dashed ? "3 2" : undefined} />
      <path d="M11,1 L17,4 L11,7 z" fill={color} />
    </svg>
  );
}

// Leyenda compacta de los diagramas de Gantt: se coloca en la cabecera, a la derecha del título.
// Los grupos se separan con una línea vertical y pueden llevar un rótulo.
export function GanttLegend({ groups }: { groups: GanttLegendGroup[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
      {groups.map((g, i) => (
        <Fragment key={g.key}>
          {i > 0 ? <span aria-hidden className="h-3.5 w-px bg-border" /> : null}
          {g.label ? <span className="font-semibold text-foreground/70">{g.label}:</span> : null}
          {g.items.map((item) => (
            <span key={item.key} className="flex items-center gap-1" title={item.title}>
              {item.swatch}
              {item.label}
            </span>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
