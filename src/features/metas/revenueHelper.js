// Helpers de receita. Regra do negócio:
// — RECEITA conta APENAS quotes com status "Emitido" (data efetiva da emissão).
// — PIPELINE = Aprovado + Aguardando Emissão (mostrado separado, NÃO somado à receita).

export const REVENUE_STATUSES = ["Emitido"];
export const APPROVED_PIPELINE_STATUSES = ["Aprovado", "Aguardando Emissão"];

const getIssuedDate = (q) =>
  q?.emission_completed_date || q?.issued_date || q?.created_date || null;

// Retorna apenas quotes que entram na receita (Emitido).
export function getRevenueQuotes(quotes = []) {
  return (quotes || []).filter((q) => REVENUE_STATUSES.includes(q?.status));
}

// Soma o total_value dos quotes que entram na receita.
export function getTotalRevenue(quotes = []) {
  return getRevenueQuotes(quotes).reduce(
    (sum, q) => sum + (Number(q.total_value) || 0),
    0,
  );
}

// Receita de um mês específico (YYYY-MM). Usa a data de emissão para alocação.
export function getMonthRevenue(quotes = [], month) {
  if (!month) return 0;
  return getRevenueQuotes(quotes)
    .filter((q) => {
      const d = getIssuedDate(q);
      if (!d) return false;
      const date = new Date(d);
      if (Number.isNaN(date.getTime())) return false;
      const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return ym === month;
    })
    .reduce((sum, q) => sum + (Number(q.total_value) || 0), 0);
}

// Receita por período [start, end] usando a data de emissão (não created_date).
export function getRevenueQuotesInPeriod(quotes = [], startDate, endDate) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  return getRevenueQuotes(quotes).filter((q) => {
    const raw = getIssuedDate(q);
    if (!raw) return false;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    return d >= start && d <= end;
  });
}
