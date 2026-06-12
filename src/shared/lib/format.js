// Formatadores centralizados (fonte única). Antes havia ~24 cópias de
// formatBRL e ~10 variantes de data espalhadas pelas páginas.

// Moeda BRL. NaN-safe: entradas inválidas viram R$ 0,00 (variante mais
// defensiva entre as cópias consolidadas).
export const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Data "DD/MM/YYYY" a partir de "YYYY-MM-DD" (split — sem shift de fuso) ou
// ISO com hora (delegado ao toLocaleDateString). Versão mais completa entre
// as cópias. `fallback` cobre a divergência de call sites ("—" vs "").
export const formatDateBR = (dateStr, fallback = "—") => {
  if (!dateStr) return fallback;
  const s = String(dateStr);
  if (s.includes("T")) {
    return new Date(s).toLocaleDateString("pt-BR");
  }
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s; // malformada: devolve original (guard das cópias do parceiro)
  return `${d}/${m}/${y}`;
};

// Data + hora "DD/MM/YYYY HH:mm" a partir de ISO.
export const formatDateTimeBR = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};
