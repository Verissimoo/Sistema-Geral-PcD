import { useState, useMemo } from "react";
import { FileText, CheckCircle2 } from "lucide-react";
import { useQuotes, useUsers, useCommercialGoals } from "@/api/hooks";
import { filterCommercialQuotes } from "@/features/metas/commercialFilter";
import {
  getMonthRevenue, getRevenueQuotesInPeriod, APPROVED_PIPELINE_STATUSES,
} from "@/features/metas/revenueHelper";
import { computePricingTotals, computeCommission } from "@/shared/lib/pricingCalculator";
import { NEGOCIACAO_STATUSES, dateKey } from "@/features/dashboard/lib/dashboardUtils";

export function useDashboardData() {
  const [periodo, setPeriodo] = useState("30");
  const [periodoCustom, setPeriodoCustom] = useState({ start: "", end: "" });
  const { data: allQuotes = [] } = useQuotes();
  const { data: users = [] } = useUsers();
  const { data: goals = [] } = useCommercialGoals();

  const periodDates = useMemo(() => {
    const now = new Date();
    let startDate;
    let endDate;
    if (periodo === "custom") {
      startDate = periodoCustom.start
        ? new Date(periodoCustom.start + "T00:00:00")
        : new Date(0);
      endDate = periodoCustom.end
        ? new Date(periodoCustom.end + "T23:59:59")
        : now;
    } else {
      const days = parseInt(periodo, 10);
      startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = now;
    }
    const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    return { startDate, endDate, days };
  }, [periodo, periodoCustom]);

  // Métricas comerciais — exclui parceiro e suporte
  const commercialQuotes = useMemo(
    () => filterCommercialQuotes(allQuotes, users),
    [allQuotes, users],
  );

  // Quotes criadas no período (qualquer status)
  const periodQuotes = useMemo(() => {
    return commercialQuotes.filter((q) => {
      const d = new Date(q.created_date);
      return d >= periodDates.startDate && d <= periodDates.endDate;
    });
  }, [commercialQuotes, periodDates]);

  // RECEITA do período — só Emitido, alocada pela data de emissão
  const periodRevenue = useMemo(
    () =>
      getRevenueQuotesInPeriod(
        commercialQuotes,
        periodDates.startDate,
        periodDates.endDate,
      ),
    [commercialQuotes, periodDates],
  );
  const totalRevenue = periodRevenue.reduce(
    (s, q) => s + (Number(q.total_value) || 0),
    0,
  );
  const totalEmitidos = periodRevenue.length;

  // Pipeline do período (Aprovado + Aguardando Emissão) — usa created_date
  const pipelineQuotes = useMemo(
    () =>
      periodQuotes.filter((q) => APPROVED_PIPELINE_STATUSES.includes(q.status)),
    [periodQuotes],
  );
  const pipelineValue = pipelineQuotes.reduce(
    (s, q) => s + (Number(q.total_value) || 0),
    0,
  );

  // === MARGEM DA EQUIPE COMERCIAL ===
  // Apenas vendas EMITIDAS do período (periodRevenue já é filtrado por:
  // role vendedor/gerente via commercialQuotes + status "Emitido" + data de
  // emissão dentro do período). Lucro real via pricingCalculator — custo e
  // nipon corretamente multiplicados por passageiros, comissão considerando
  // Carteira própria (30%) quando aplicável.
  const margemEquipe = useMemo(() => {
    let receitaTotal = 0;
    let custoTotal = 0;
    let comissaoTotal = 0;

    for (const quote of periodRevenue) {
      const totals = computePricingTotals(quote);
      const commission = computeCommission(quote);
      // Para receita usamos quote.total_value (já contempla serviços extras
      // como seguro/transfer/adicional, que não entram em totals.saleTotal).
      receitaTotal += Number(quote.total_value) || totals.saleTotal;
      custoTotal += totals.costTotal;
      comissaoTotal += commission.total;
    }

    const margemBruta = receitaTotal - custoTotal;
    const margemLiquida = margemBruta - comissaoTotal;
    const pct = (v) => (receitaTotal > 0 ? (v / receitaTotal) * 100 : 0);

    return {
      receitaTotal,
      custoTotal,
      comissaoTotal,
      margemBruta,
      margemLiquida,
      pctMargemBruta: pct(margemBruta),
      pctMargemLiquida: pct(margemLiquida),
      pctComissoes: pct(comissaoTotal),
      pctCusto: pct(custoTotal),
      vendas: periodRevenue.length,
    };
  }, [periodRevenue]);

  // Vendedores ativos
  const activeSellers = useMemo(
    () =>
      users.filter(
        (u) =>
          (u.role === "vendedor" || u.role === "gerente") &&
          u.status === "Ativo",
      ),
    [users],
  );
  const emFormacao = useMemo(
    () =>
      users.filter(
        (u) => u.role === "vendedor" && (u.career_level || "N0") === "N0",
      ).length,
    [users],
  );

  // Dados do gráfico
  const chartData = useMemo(() => {
    const days = periodDates.days;
    const data = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(periodDates.startDate);
      d.setDate(d.getDate() + i);
      data.push({
        key: dateKey(d),
        label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        fullDate: d,
        cotacoes: 0,
        vendas: 0,
      });
    }
    const byKey = Object.fromEntries(data.map((d) => [d.key, d]));

    for (const q of commercialQuotes) {
      if (!q.created_date) continue;
      const d = new Date(q.created_date);
      const k = dateKey(d);
      if (byKey[k]) byKey[k].cotacoes += 1;
    }
    for (const q of commercialQuotes) {
      if (q.status !== "Emitido") continue;
      const issuedDateStr =
        q.emission_completed_date || q.issued_date || q.created_date;
      if (!issuedDateStr) continue;
      const d = new Date(issuedDateStr);
      const k = dateKey(d);
      if (byKey[k]) byKey[k].vendas += 1;
    }
    return data;
  }, [commercialQuotes, periodDates]);

  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.cotacoes, d.vendas)),
    1,
  );
  const totalCotacoes = chartData.reduce((s, d) => s + d.cotacoes, 0);
  const totalVendas = chartData.reduce((s, d) => s + d.vendas, 0);
  const conversao =
    totalCotacoes > 0
      ? ((totalVendas / totalCotacoes) * 100).toFixed(1)
      : "0.0";

  // Meta do mês atual
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const metaAtual = goals.find((g) => g.month === currentMonth);
  const receitaMes = useMemo(
    () => getMonthRevenue(commercialQuotes, currentMonth),
    [commercialQuotes, currentMonth],
  );

  // Funil de conversão
  const funil = useMemo(() => {
    const negociacao = periodQuotes.filter((q) =>
      NEGOCIACAO_STATUSES.includes(q.status),
    );
    const aprovadas = periodQuotes.filter((q) => q.status === "Aprovado");
    const aguardando = periodQuotes.filter(
      (q) => q.status === "Aguardando Emissão",
    );
    const emitidas = periodQuotes.filter((q) => q.status === "Emitido");
    return [
      { label: "Em negociação", count: negociacao.length, color: "bg-accent" },
      { label: "Aprovadas", count: aprovadas.length, color: "bg-info" },
      { label: "Aguardando emissão", count: aguardando.length, color: "bg-warning" },
      { label: "Emitidas (receita)", count: emitidas.length, color: "bg-success" },
    ];
  }, [periodQuotes]);

  // Top 5 vendedores
  const topPerformers = useMemo(() => {
    const sellers = users.filter(
      (u) =>
        (u.role === "vendedor" || u.role === "gerente") &&
        u.status === "Ativo",
    );
    const ranked = sellers.map((seller) => {
      const sellerRevenue = periodRevenue.filter(
        (q) => q.seller_id === seller.id,
      );
      const totalRev = sellerRevenue.reduce(
        (s, q) => s + (Number(q.total_value) || 0),
        0,
      );
      const sellerCotacoes = periodQuotes.filter(
        (q) => q.seller_id === seller.id,
      );
      return {
        ...seller,
        receita: totalRev,
        vendas: sellerRevenue.length,
        cotacoes: sellerCotacoes.length,
      };
    });
    return ranked
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5)
      .filter((r) => r.receita > 0 || r.cotacoes > 0);
  }, [users, periodRevenue, periodQuotes]);

  const maxSellerRevenue = topPerformers[0]?.receita || 1;

  // Atividade recente — criações + emissões
  const recentActivity = useMemo(() => {
    const events = [];
    for (const q of commercialQuotes) {
      if (q.created_date) {
        events.push({
          type: "created",
          date: q.created_date,
          quote: q,
          icon: FileText,
          color: "text-accent",
          label: "criou orçamento",
        });
      }
      if (q.status === "Emitido" && (q.emission_completed_date || q.issued_date)) {
        events.push({
          type: "issued",
          date: q.emission_completed_date || q.issued_date,
          quote: q,
          icon: CheckCircle2,
          color: "text-success",
          label: "emitiu",
        });
      }
    }
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return events.slice(0, 8);
  }, [commercialQuotes]);

  return {
    periodo,
    setPeriodo,
    periodoCustom,
    setPeriodoCustom,
    periodDates,
    periodQuotes,
    totalRevenue,
    totalEmitidos,
    pipelineQuotes,
    pipelineValue,
    margemEquipe,
    activeSellers,
    emFormacao,
    chartData,
    maxValue,
    totalCotacoes,
    totalVendas,
    conversao,
    now,
    metaAtual,
    receitaMes,
    funil,
    topPerformers,
    maxSellerRevenue,
    recentActivity,
  };
}
