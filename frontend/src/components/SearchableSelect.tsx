import { useEffect, useId, useMemo, useRef, useState } from "react";
import { normalizar } from "../lib/search";
import type { SelectOption } from "./SelectField";

const MAX_RESULTADOS = 50;

// Selector de una sola opción con campo de búsqueda: escribe para filtrar, pulsa Enter
// o haz clic para elegir. Elegir otra opción sustituye a la anterior.
export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Escribe para buscar…",
  emptyText = "Sin coincidencias",
  isRequired,
  clearable = !isRequired,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  emptyText?: string;
  isRequired?: boolean;
  clearable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const inputId = useId();

  const seleccionada = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);

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

  const cerrar = () => {
    setAbierto(false);
    setQuery("");
  };

  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) cerrar();
    };
    document.addEventListener("mousedown", alPulsarFuera);
    return () => document.removeEventListener("mousedown", alPulsarFuera);
  }, [abierto]);

  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>(`[data-index="${activo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  const abrir = () => {
    if (abierto) return;
    setAbierto(true);
    // Al abrir, el cursor se coloca sobre la opción ya elegida.
    const idx = options.findIndex((o) => o.id === value);
    setActivo(idx >= 0 && idx < MAX_RESULTADOS ? idx : 0);
  };

  const elegir = (id: string) => {
    onChange(id);
    cerrar();
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      abrir();
      setActivo((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Evita que Enter envíe el formulario del modal.
      e.preventDefault();
      const opcion = filtradas[activo];
      if (abierto && opcion) elegir(opcion.id);
    } else if (e.key === "Escape" && abierto) {
      e.stopPropagation();
      cerrar();
    } else if (e.key === "Tab") {
      cerrar();
    }
  };

  return (
    <div ref={contenedorRef} className="relative flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
        {isRequired ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      <div
        className="flex min-h-10 items-center gap-1 rounded-lg border border-border bg-field px-3 py-1 focus-within:ring-2 focus-within:ring-accent"
        onClick={() => {
          abrir();
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted"
          // Cerrado se muestra la opción elegida; abierto, lo que el usuario escribe.
          placeholder={abierto && seleccionada ? seleccionada.label : placeholder}
          value={abierto ? query : (seleccionada?.label ?? "")}
          role="combobox"
          aria-expanded={abierto}
          aria-autocomplete="list"
          aria-required={isRequired}
          onChange={(e) => {
            setQuery(e.target.value);
            setActivo(0);
            setAbierto(true);
          }}
          onFocus={abrir}
          onKeyDown={onKeyDown}
        />
        {clearable && seleccionada ? (
          <button
            type="button"
            aria-label={`Quitar ${label.toLowerCase()}`}
            className="shrink-0 px-1 text-muted hover:text-danger"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              cerrar();
            }}
          >
            ×
          </button>
        ) : null}
        <span aria-hidden className={`shrink-0 text-xs text-muted transition-transform ${abierto ? "rotate-180" : ""}`}>
          ▾
        </span>
      </div>
      {abierto ? (
        <ul
          ref={listaRef}
          role="listbox"
          className="absolute top-full z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-overlay p-1 shadow-lg"
        >
          {filtradas.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted">{emptyText}</li>
          ) : (
            filtradas.map((o, i) => {
              const marcada = o.id === value;
              return (
                <li
                  key={o.id}
                  data-index={i}
                  role="option"
                  aria-selected={marcada}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${i === activo ? "bg-default" : ""}`}
                  onMouseEnter={() => setActivo(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(o.id)}
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
