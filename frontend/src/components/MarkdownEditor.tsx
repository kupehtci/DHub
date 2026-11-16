import { useId, useLayoutEffect, useRef, useState } from "react";
import { MarkdownView } from "./MarkdownView";

type Modo = "escribir" | "vista";

interface Accion {
  etiqueta: string;
  titulo: string;
  aplicar: (seleccion: string) => { texto: string; cursor?: [number, number] };
  // Las acciones de bloque se insertan al principio de la línea.
  bloque?: boolean;
}

const envolver = (antes: string, despues = antes, ejemplo = "texto") => (sel: string) => {
  const contenido = sel || ejemplo;
  return { texto: `${antes}${contenido}${despues}`, cursor: [antes.length, antes.length + contenido.length] as [number, number] };
};

const prefijarLineas = (prefijo: (i: number) => string, ejemplo: string) => (sel: string) => {
  const lineas = (sel || ejemplo).split("\n");
  const texto = lineas.map((l, i) => `${prefijo(i)}${l}`).join("\n");
  return { texto, cursor: sel ? undefined : ([prefijo(0).length, texto.length] as [number, number]) };
};

const ACCIONES: Accion[] = [
  { etiqueta: "H2", titulo: "Título", aplicar: prefijarLineas(() => "## ", "Título"), bloque: true },
  { etiqueta: "H3", titulo: "Subtítulo", aplicar: prefijarLineas(() => "### ", "Subtítulo"), bloque: true },
  { etiqueta: "B", titulo: "Negrita (Ctrl+B)", aplicar: envolver("**") },
  { etiqueta: "I", titulo: "Cursiva (Ctrl+I)", aplicar: envolver("_") },
  { etiqueta: "</>", titulo: "Código en línea", aplicar: envolver("`", "`", "código") },
  {
    etiqueta: "{ }",
    titulo: "Bloque de código",
    aplicar: (sel) => {
      const contenido = sel || "código";
      return { texto: "```\n" + contenido + "\n```", cursor: [4, 4 + contenido.length] };
    },
    bloque: true,
  },
  { etiqueta: "•", titulo: "Lista", aplicar: prefijarLineas(() => "- ", "Elemento"), bloque: true },
  { etiqueta: "1.", titulo: "Lista numerada", aplicar: prefijarLineas((i) => `${i + 1}. `, "Elemento"), bloque: true },
  { etiqueta: "☐", titulo: "Lista de tareas", aplicar: prefijarLineas(() => "- [ ] ", "Pendiente"), bloque: true },
  { etiqueta: "❝", titulo: "Cita", aplicar: prefijarLineas(() => "> ", "Cita"), bloque: true },
  {
    etiqueta: "🔗",
    titulo: "Enlace",
    aplicar: (sel) => {
      const contenido = sel || "texto";
      // Deja seleccionada la URL para sustituirla directamente.
      const inicioUrl = contenido.length + 3;
      return { texto: `[${contenido}](https://)`, cursor: [inicioUrl, inicioUrl + 8] };
    },
  },
];

// Editor de texto con formato Markdown: barra de botones, vista previa y un área de
// texto que crece según se escribe (hasta un máximo, a partir del cual hace scroll).
export function MarkdownEditor({
  label,
  value,
  onChange,
  placeholder = "Escribe aquí… admite Markdown: ## títulos, **negrita**, `código`, listas…",
  minRows = 6,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const [modo, setModo] = useState<Modo>("escribir");
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  // Autoajuste de altura: se reinicia a "auto" para medir el contenido real.
  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta || modo !== "escribir") return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight + 2}px`;
  }, [value, modo]);

  const aplicar = (accion: Accion) => {
    const ta = ref.current;
    if (!ta) return;
    let inicio = ta.selectionStart;
    const fin = ta.selectionEnd;
    if (accion.bloque) {
      // Lleva el inicio al principio de la línea para que el prefijo quede bien puesto.
      inicio = value.lastIndexOf("\n", inicio - 1) + 1;
    }
    const seleccion = value.slice(inicio, fin);
    const { texto, cursor } = accion.aplicar(seleccion);
    // Un bloque insertado a mitad de texto necesita su propia línea.
    const separador = accion.bloque && inicio > 0 && value[inicio - 1] !== "\n" ? "\n" : "";
    const nuevo = value.slice(0, inicio) + separador + texto + value.slice(fin);
    onChange(nuevo);
    requestAnimationFrame(() => {
      ta.focus();
      const base = inicio + separador.length;
      if (cursor) ta.setSelectionRange(base + cursor[0], base + cursor[1]);
      else ta.setSelectionRange(base + texto.length, base + texto.length);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const atajo = e.key.toLowerCase() === "b" ? "B" : e.key.toLowerCase() === "i" ? "I" : null;
    if (atajo) {
      e.preventDefault();
      aplicar(ACCIONES.find((a) => a.etiqueta === atajo)!);
    }
  };

  const pestana = (m: Modo, texto: string) => (
    <button
      type="button"
      onClick={() => setModo(m)}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        modo === m ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="overflow-hidden rounded-lg border border-border bg-field focus-within:ring-2 focus-within:ring-accent">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-secondary/60 px-2 py-1">
          <div className="flex rounded-lg bg-surface-secondary p-0.5">
            {pestana("escribir", "Escribir")}
            {pestana("vista", "Vista previa")}
          </div>
          {modo === "escribir" ? (
            <div className="flex flex-wrap items-center gap-0.5">
              {ACCIONES.map((a) => (
                <button
                  key={a.etiqueta}
                  type="button"
                  title={a.titulo}
                  aria-label={a.titulo}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => aplicar(a)}
                  className={`min-w-7 rounded px-1.5 py-0.5 text-xs text-muted hover:bg-surface hover:text-foreground ${
                    a.etiqueta === "B" ? "font-bold" : a.etiqueta === "I" ? "italic" : a.etiqueta.includes("<") || a.etiqueta.includes("{") ? "font-mono" : ""
                  }`}
                >
                  {a.etiqueta}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {modo === "escribir" ? (
          <textarea
            ref={ref}
            id={id}
            value={value}
            rows={minRows}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="block max-h-[60vh] w-full resize-y bg-transparent px-3 py-2 font-mono text-sm leading-relaxed outline-none placeholder:font-sans placeholder:text-muted"
          />
        ) : (
          <div className="max-h-[60vh] min-h-32 overflow-y-auto px-3 py-2">
            {value.trim() ? <MarkdownView>{value}</MarkdownView> : <p className="text-sm text-muted">Nada que previsualizar.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
