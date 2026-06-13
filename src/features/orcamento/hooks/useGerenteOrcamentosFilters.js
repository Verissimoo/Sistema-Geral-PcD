import { useMemo } from "react";

// Derivações de filtro/resumo da Central de Orçamentos (gerente).
// Lógica pura extraída de GerenteOrcamentos — sem mudança de comportamento.
export function useGerenteOrcamentosFilters({
  quotes,
  users,
  search,
  statusFilter,
  sellerFilter,
  periodFilter,
  ticketTypeFilter,
  recipientFilter,
}) {
  const sellers = useMemo(
    () => users.filter((u) => u.role === "vendedor"),
    [users]
  );

  const filtered = useMemo(() => {
    let list = [...quotes];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.client?.name?.toLowerCase().includes(q) ||
          x.partner_name?.toLowerCase().includes(q) ||
          x.partner_client_data?.name?.toLowerCase().includes(q) ||
          x.quote_number?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "Todos") {
      list = list.filter((x) => (x.status || "Enviado") === statusFilter);
    }
    if (sellerFilter !== "Todos") {
      list = list.filter((x) => x.seller_id === sellerFilter);
    }
    if (ticketTypeFilter !== "Todos") {
      list = list.filter((x) => (x.ticket_type || "Normal") === ticketTypeFilter);
    }
    if (recipientFilter !== "Todos") {
      list = list.filter((x) => (x.recipient_type || "cliente") === recipientFilter);
    }
    if (periodFilter !== "all") {
      const now = Date.now();
      const cutoffs = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        quarter: 90 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - (cutoffs[periodFilter] || 0);
      list = list.filter((x) => new Date(x.created_date).getTime() >= cutoff);
    }

    list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return list;
  }, [quotes, search, statusFilter, sellerFilter, periodFilter, ticketTypeFilter, recipientFilter]);

  const summary = useMemo(() => {
    const sold = filtered.filter((q) => q.status === "Aprovado" || q.status === "Emitido");
    const totalValue = filtered.reduce((s, q) => s + (q.total_value || 0), 0);
    const revenueSold = sold.reduce((s, q) => s + (q.total_value || 0), 0);
    const avgTicket = sold.length > 0 ? revenueSold / sold.length : 0;
    return {
      total: filtered.length,
      totalValue,
      sold: sold.length,
      revenueSold,
      avgTicket,
    };
  }, [filtered]);

  const pendingOver48h = useMemo(() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    return quotes
      .filter((q) => q.status === "Enviado" && new Date(q.created_date).getTime() < cutoff)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [quotes]);

  return { sellers, filtered, summary, pendingOver48h };
}
