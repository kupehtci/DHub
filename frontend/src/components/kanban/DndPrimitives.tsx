import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

export function DroppableColumn({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`kanban-column flex flex-col gap-2 rounded-xl border p-2 transition-colors ${
        isOver ? "border-accent bg-accent-soft/40" : "border-border bg-surface-secondary/60"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function DraggableCard({ id, columnId, children }: { id: string; columnId: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { columnId },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cursor-grab touch-none active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}
