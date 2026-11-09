import { useEffect, useState } from "react";
import { jiraApi } from "../lib/api";
import type { JiraTicketInfo } from "../types";

// Trae en un único lote el estado "en vivo" (con caché de unos minutos en el backend)
// de todos los tickets de Jira enlazados a las tareas visibles, para poder mostrar
// una etiqueta de estado sin tener que pulsar nada por tarea.
export function useJiraTickets(claves: (string | null | undefined)[]): Map<string, JiraTicketInfo> {
  const clavesClave = Array.from(new Set(claves.filter((c): c is string => !!c))).sort().join(",");
  const [mapa, setMapa] = useState<Map<string, JiraTicketInfo>>(new Map());

  useEffect(() => {
    const lista = clavesClave ? clavesClave.split(",") : [];
    if (lista.length === 0) {
      setMapa(new Map());
      return;
    }
    jiraApi
      .ticketsLote(lista)
      .then((r) => setMapa(new Map(r.data.map((t) => [t.clave, t]))))
      .catch(() => setMapa(new Map()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavesClave]);

  return mapa;
}
