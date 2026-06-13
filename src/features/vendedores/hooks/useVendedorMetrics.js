import { useMemo } from "react";
import { CAREER_LEVELS } from "@/features/carreira/careerPlan";
import { getRevenueQuotes } from "@/features/metas/revenueHelper";
import { computePricingTotals, computeCommission } from "@/shared/lib/pricingCalculator";

// Centraliza todas as derivações pesadas da página de detalhe do vendedor.
// Comportamento/cálculos idênticos ao componente original — apenas extraído.
export function useVendedorMetrics({
  vendedor,
  quotes,
  clients,
  statusFilter,
  search,
}) {
  const currentMonth = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const vendidos = useMemo(() => getRevenueQuotes(quotes), [quotes]);

  const cotacoesMes = useMemo(
    () => quotes.filter((q) => q.created_date?.startsWith(currentMonth)),
    [quotes, currentMonth]
  );

  const vendidosMes = useMemo(
    () =>
      vendidos.filter((q) => {
        const d = q.emission_completed_date || q.issued_date || q.created_date;
        return d?.startsWith(currentMonth);
      }),
    [vendidos, currentMonth]
  );

  const receitaMes = vendidosMes.reduce((s, q) => s + (Number(q.total_value) || 0), 0);
  const receitaTotal = vendidos.reduce((s, q) => s + (Number(q.total_value) || 0), 0);

  // Comissão e lucro vêm da fonte única (pricingCalculator). Reotimiza pelo
  // helper em vez de confiar em quote.commission.total — assim, quotes antigos
  // que ainda têm a comissão calculada errada também aparecem corrigidos.
  const comissaoMes = vendidosMes.reduce(
    (s, q) => s + computeCommission(q).total,
    0
  );
  const comissaoTotal = vendidos.reduce(
    (s, q) => s + computeCommission(q).total,
    0
  );
  const lucroMes = vendidosMes.reduce(
    (s, q) => s + computePricingTotals(q).margemBruta,
    0
  );

  const taxaConversaoTotal =
    quotes.length > 0 ? (vendidos.length / quotes.length) * 100 : 0;
  const ticketMedio = vendidos.length > 0 ? receitaTotal / vendidos.length : 0;

  const pipeline = useMemo(
    () => quotes.filter((q) => ["Aprovado", "Aguardando Emissão"].includes(q.status)),
    [quotes]
  );

  const followUpsPendentes = quotes.filter((q) => q.status === "FollowUp Pendente").length;

  const clientesDoVendedor = useMemo(() => {
    const ids = new Set();
    for (const q of quotes) {
      if (q.client?.id) ids.add(q.client.id);
    }
    return clients.filter((c) => ids.has(c.id));
  }, [quotes, clients]);

  const diasAtivo = vendedor?.created_date
    ? Math.floor(
        (Date.now() - new Date(vendedor.created_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;
  const tempoAtivo =
    diasAtivo >= 30
      ? `${Math.floor(diasAtivo / 30)} ${Math.floor(diasAtivo / 30) === 1 ? "mês" : "meses"}`
      : `${diasAtivo} ${diasAtivo === 1 ? "dia" : "dias"}`;

  const idxAtual = vendedor
    ? CAREER_LEVELS.findIndex((l) => l.level === (vendedor.career_level || "N0"))
    : -1;
  const nivelAtual = idxAtual >= 0 ? CAREER_LEVELS[idxAtual] : CAREER_LEVELS[0];
  const fixoMensal = Number(nivelAtual?.fixedSalary) || 0;
  const metaNivel = Number(nivelAtual?.monthlyGoal) || 0;
  const pctMeta = metaNivel > 0 ? Math.min(100, (receitaMes / metaNivel) * 100) : 0;

  // Próximo nível — linear até N5; N5 bifurca, N6A/B são terminais.
  const proximoNivel = useMemo(() => {
    if (idxAtual < 0) return null;
    const cur = CAREER_LEVELS[idxAtual];
    if (!cur || cur.level === "N5" || cur.level === "N6A" || cur.level === "N6B") {
      return null;
    }
    return CAREER_LEVELS[idxAtual + 1] || null;
  }, [idxAtual]);

  const evolucaoMensal = useMemo(() => {
    const n = new Date();
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(n.getFullYear(), n.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const labelRaw = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const cotacoesMesEvo = quotes.filter((q) => q.created_date?.startsWith(monthStr));
      const vendidosMesEvo = vendidos.filter((q) => {
        const dt = q.emission_completed_date || q.issued_date || q.created_date;
        return dt?.startsWith(monthStr);
      });
      const receitaMesEvo = vendidosMesEvo.reduce(
        (s, q) => s + (Number(q.total_value) || 0),
        0
      );
      meses.push({
        label: labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1),
        monthStr,
        cotacoes: cotacoesMesEvo.length,
        vendas: vendidosMesEvo.length,
        receita: receitaMesEvo,
      });
    }
    return meses;
  }, [quotes, vendidos]);

  const topClientes = useMemo(() => {
    const byClient = {};
    for (const q of vendidos) {
      const cid = q.client?.id;
      if (!cid) continue;
      if (!byClient[cid]) {
        byClient[cid] = {
          id: cid,
          name: q.client.name,
          phone: q.client.phone,
          total: 0,
          count: 0,
        };
      }
      byClient[cid].total += Number(q.total_value) || 0;
      byClient[cid].count += 1;
    }
    return Object.values(byClient)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [vendidos]);

  const historicoFiltrado = useMemo(() => {
    let result = [...quotes];
    if (statusFilter !== "all") {
      result = result.filter((q) => q.status === statusFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (q) =>
          q.quote_number?.toLowerCase().includes(s) ||
          q.client?.name?.toLowerCase().includes(s) ||
          q.partner_name?.toLowerCase().includes(s)
      );
    }
    return result.sort(
      (a, b) =>
        new Date(b.created_date || 0).getTime() -
        new Date(a.created_date || 0).getTime()
    );
  }, [quotes, statusFilter, search]);

  return {
    vendidos,
    cotacoesMes,
    vendidosMes,
    receitaMes,
    receitaTotal,
    comissaoMes,
    comissaoTotal,
    lucroMes,
    taxaConversaoTotal,
    ticketMedio,
    pipeline,
    followUpsPendentes,
    clientesDoVendedor,
    tempoAtivo,
    idxAtual,
    nivelAtual,
    fixoMensal,
    metaNivel,
    pctMeta,
    proximoNivel,
    evolucaoMensal,
    topClientes,
    historicoFiltrado,
  };
}
