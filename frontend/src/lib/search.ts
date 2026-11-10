// Normaliza para buscar sin distinguir mayúsculas ni tildes.
export const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
