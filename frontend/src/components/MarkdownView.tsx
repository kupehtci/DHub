import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Estilos de cada elemento Markdown con las clases de Tailwind del tema (no usamos el
// plugin de tipografía para que encaje con los colores de HeroUI en claro y oscuro).
const COMPONENTES: Components = {
  h1: ({ children }) => <h1 className="mb-2 mt-3 text-xl font-semibold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-3 text-lg font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-base font-semibold first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  // Las listas de tareas (- [ ] / - [x]) llegan con las clases "contains-task-list" y
  // "task-list-item": se muestran sin viñeta, solo con la casilla.
  ul: ({ children, className }) => (
    <ul className={`my-2 space-y-0.5 ${className?.includes("contains-task-list") ? "list-none pl-1" : "list-disc pl-5"}`}>{children}</ul>
  ),
  ol: ({ children, className }) => (
    <ol className={`my-2 space-y-0.5 ${className?.includes("contains-task-list") ? "list-none pl-1" : "list-decimal pl-5"}`}>{children}</ol>
  ),
  li: ({ children, className }) => (
    <li className={`leading-relaxed ${className?.includes("task-list-item") ? "flex items-start gap-1.5 [&>p]:my-0" : ""}`}>{children}</li>
  ),
  a: ({ children, href }) => (
    <a className="text-link hover:underline" href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-border pl-3 text-muted">{children}</blockquote>,
  hr: () => <hr className="my-3 border-border" />,
  code: ({ children, className }) =>
    // Los bloques ``` llegan con className "language-x"; el código en línea, sin ella.
    className ? (
      <code className={`${className} font-mono text-xs`}>{children}</code>
    ) : (
      <code className="rounded bg-surface-secondary px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
    ),
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg border border-border bg-surface-secondary p-3">{children}</pre>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border bg-surface-secondary px-2 py-1 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
  input: ({ checked }) => (
    <input checked={!!checked} className="mt-[0.3em] h-3.5 w-3.5 shrink-0 accent-[var(--accent)]" disabled readOnly type="checkbox" />
  ),
};

// GFM solo reconoce "- [ ] texto" (con espacio dentro y dentro de una lista). Aceptamos
// también las formas habituales al escribir rápido: "[] texto", "[ ] texto", "[x] texto"
// al principio de línea o tras la viñeta. No se toca el contenido de bloques de código.
const CASILLA_RE = /^(\s*)(?:([-*+]|\d+[.)])\s+)?\[( |x|X)?\](?=\s|$)/;

export function normalizarCasillas(markdown: string): string {
  let enBloqueCodigo = false;
  return markdown
    .split("\n")
    .map((linea) => {
      if (/^\s*(```|~~~)/.test(linea)) {
        enBloqueCodigo = !enBloqueCodigo;
        return linea;
      }
      if (enBloqueCodigo) return linea;
      return linea.replace(CASILLA_RE, (_m, sangria: string, vineta: string | undefined, marca: string | undefined) => {
        const marcada = marca === "x" || marca === "X";
        return `${sangria}${vineta ?? "-"} [${marcada ? "x" : " "}]`;
      });
    })
    .join("\n");
}

export function MarkdownView({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`break-words text-sm text-foreground ${className}`}>
      <ReactMarkdown components={COMPONENTES} remarkPlugins={[remarkGfm]}>
        {normalizarCasillas(children)}
      </ReactMarkdown>
    </div>
  );
}
