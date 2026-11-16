import type { EstadoHito } from "../types";
import { api } from "./api";

export interface AnaliticasFiltros {
  equipoId?: string;
  proyectoId?: string;
  personaId?: string;
  desde?: string;
  hasta?: string;
}

export interface HitoAnalitica {
  id: string;
  proyectoId: string;
  proyectoCodigo: string;
  proyectoNombre: string;
  equipoId?: string | null;
  nombre: string;
  fecha: string;
  estado: EstadoHito;
}

function qs(params: AnaliticasFiltros) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const str = search.toString();
  return str ? `?${str}` : "";
}

export const analiticasApi = {
  hitos: (f: AnaliticasFiltros = {}) => api.get<HitoAnalitica[]>(`/api/analiticas/hitos${qs(f)}`),
};
