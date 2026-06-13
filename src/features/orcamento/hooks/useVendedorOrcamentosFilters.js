import { useMemo } from "react";

// Derivações de filtro/métricas da lista de orçamentos do vendedor.
// Lógica pura extraída de VendedorOrcamentos — sem mudança de comportamento.
export function useVendedorOrcamentosFilters({
  allQuotes,
  isAdmin,
  userId,
  search,
  statusFilter,
  periodFilter,
  sortBy,
}) {
  // Vendedor enxerga apenas as próprias cotações; admin vê todas.
  const quotes = useMemo(
    () => (isAdmin ? allQuotes : allQuotes.filter((q) => q.seller_id === userId)),
    [allQuotes, isAdmin, userId]
  );

  const filtered = useMemo(() => {
    let list = [...quotes];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((x) => x.client?.name?.toLowerCase().includes(q));
    }
    if (statusFilter !== "Todos") {
      list = list.filter((x) => (x.status || "Enviado") === statusFilter);
    }
    if (periodFilter !== "all") {
      const days = periodFilter === "week" ? 7 : 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter((x) => new Date(x.created_date).getTime() >= cutoff);
    }
    if (sortBy === "recent") {
      list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else if (sortBy === "value") {
      list.sort((a, b) => (b.total_value || 0) - (a.total_value || 0));
    } else if (sortBy === "status") {
      list.sort((a, b) => (a.status || "").localeCompare(b.status || ""));
    }
    return list;
  }, [quotes, search, statusFilter, periodFilter, sortBy]);

  const metrics = useMemo(() => {
    const total = quotes.length;
    const enviados = quotes.filter((x) => x.status === "Enviado").length;
    const aprovados = quotes.filter((x) => x.status === "Aprovado").length;
    const valorAprovado = quotes
      .filter((x) => x.status === "Aprovado")
      .reduce((acc, x) => acc + (Number(x.total_value) || 0), 0);
    return { total, enviados, aprovados, valorAprovado };
  }, [quotes]);

  return { quotes, filtered, metrics };
}
