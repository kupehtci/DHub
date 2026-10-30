import { IconJira } from "./Icons";

export function JiraLink({ url, label, className = "" }: { url: string; label: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-link/40 hover:bg-surface-secondary/70 ${className}`}
    >
      <IconJira />
      {label}
    </a>
  );
}
