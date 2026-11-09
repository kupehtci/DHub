import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SelectOption } from "./SelectField";

const MAX_RESULTADOS = 50;

// Normaliza para buscar sin distinguir mayúsculas ni tildes.
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Selector múltiple con campo de búsqueda: escribe para filtrar las opciones, pulsa
// Enter o haz clic para añadir/quitar, y quita las seleccionadas desde sus chips.
export function SearchableMultiSelect({
  label,
  values,
  onChange,
  options,
  placeholder = "Escribe para buscar…",
  emptyText = "Sin coincidencias",
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const inputId = useId();

  const seleccionadas = useMemo(() => {
    const porId = new Map(options.map((o) => [o.id, o]));
    return values.map((v) => porId.get(v)).filter((o): o is SelectOption => !!o);
  }, [options, values]);

  const filtradas = useMemo(() => {
    const terminos = normalizar(query).split(/\s+/).filter(Boolean);
    const lista = terminos.length
      ? options.filter((o) => {
          const texto = normalizar(o.label);
          return terminos.every((t) => texto.includes(t));
        })
      : options;
    return lista.slice(0, MAX_RESULTADOS);
  }, [options, query]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>(`[data-index="${activo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  const alternar = (id: string) => onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setActivo((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Evita que Enter envíe el formulario del modal.
      e.preventDefault();
      const opcion = filtradas[activo];
      if (abierto && opcion) {
        alternar(opcion.id);
        setQuery("");
        setActivo(0);
      }
    } else if (e.key === "Escape" && abierto) {
      e.stopPropagation();
      setAbierto(false);
    } else if (e.key === "Backspace" && !query && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div ref={contenedorRef} className="relative flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div
        className="flex min-h-10 flex-wrap items-center gap-1 rounded-lg border border-border bg-field px-2 py-1 focus-within:ring-2 focus-within:ring-accent"
        onClick={() => setAbierto(true)}
      >
        {seleccionadas.map((o) => (
          <span key={o.id} className="flex max-w-full items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs text-accent-soft-foreground">
            <span className="truncate">{o.label}</span>
            <button
              type="button"
              aria-label={`Quitar ${o.label}`}
              className="shrink-0 font-semibold hover:text-danger"
              onClick={(e) => {
                e.stopPropagation();
                alternar(o.id);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted"
          placeholder={seleccionadas.length ? "" : placeholder}
          value={query}
          role="combobox"
          aria-expanded={abierto}
          aria-autocomplete="list"
          onChange={(e) => {
            setQuery(e.target.value);
            setActivo(0);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      {abierto ? (
        <ul
          ref={listaRef}
          role="listbox"
          aria-multiselectable
          className="absolute top-full z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-overlay p-1 shadow-lg"
        >
          {filtradas.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted">{emptyText}</li>
          ) : (
            filtradas.map((o, i) => {
              const marcada = values.includes(o.id);
              return (
                <li
                  key={o.id}
                  data-index={i}
                  role="option"
                  aria-selected={marcada}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${i === activo ? "bg-default" : ""}`}
                  onMouseEnter={() => setActivo(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => alternar(o.id)}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      marcada ? "border-accent bg-accent text-accent-foreground" : "border-border"
                    }`}
                  >
                    {marcada ? "✓" : ""}
                  </span>
                  <span className="truncate">{o.label}</span>
                </li>
              );
            })
          )}
          {filtradas.length === MAX_RESULTADOS ? (
            <li className="px-2 py-1 text-xs text-muted">Mostrando {MAX_RESULTADOS} resultados; escribe para afinar la búsqueda.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
