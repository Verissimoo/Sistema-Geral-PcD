import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, CheckCircle2, TrendingUp, DollarSign, Users,
  Calendar, Target, Trophy, BarChart3, Filter, Activity, ArrowRight,
  Wallet, TrendingDown, Receipt, PiggyBank,
} from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { useQuotes, useUsers, useCommercialGoals } from "@/api/hooks";
import { filterCommercialQuotes } from "@/features/metas/commercialFilter";
import {
  getMonthRevenue, getRevenueQuotesInPeriod, APPROVED_PIPELINE_STATUSES,
} from "@/features/metas/revenueHelper";
import { computePricingTotals, computeCommission } from "@/shared/lib/pricingCalculator";
import { formatBRL } from "@/shared/lib/format";

const NEGOCIACAO_STATUSES = [
  "Enviado",
  "FollowUp Pendente",
  "FollowUp 1 Enviado",
  "FollowUp 2 Enviado",
  "FollowUp 3 Enviado",
];

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const timeAgo = (date) => {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d}d`;
  return new Date(date).toLocaleDateString("pt-BR");
};

export default function Dashboard() {
  const navigate = useNavigate();
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Dashboard Gerencial
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Visão geral da operação — PassagensComDesconto
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2 text-text-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Último mês</SelectItem>
              <SelectItem value="90">Último trimestre</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {periodo === "custom" && (
            <>
              <Input
                type="date"
                value={periodoCustom.start}
                onChange={(e) =>
                  setPeriodoCustom((p) => ({ ...p, start: e.target.value }))
                }
                className="w-40"
              />
              <span className="text-text-muted">até</span>
              <Input
                type="date"
                value={periodoCustom.end}
                onChange={(e) =>
                  setPeriodoCustom((p) => ({ ...p, end: e.target.value }))
                }
                className="w-40"
              />
            </>
          )}

          <Badge variant="outline" className="ml-2">
            {now.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </Badge>
        </div>
      </div>

      {/* Row 1 — 5 cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={FileText}
          iconColor="text-accent"
          iconBg="bg-accent-subtle"
          label="Cotações"
          value={periodQuotes.length}
          subtext="No período selecionado"
          badge={`${periodDates.days}d`}
        />

        <MetricCard
          icon={CheckCircle2}
          iconColor="text-success"
          iconBg="bg-success-subtle"
          label="Vendas Emitidas"
          value={totalEmitidos}
          subtext={formatBRL(totalRevenue)}
          extra={
            pipelineQuotes.length > 0 && (
              <span className="text-xs text-warning font-medium tabular-nums">
                + {pipelineQuotes.length} em pipeline ({formatBRL(pipelineValue)})
              </span>
            )
          }
        />

        <MetricCard
          icon={TrendingUp}
          iconColor="text-warning"
          iconBg="bg-warning-subtle"
          label="Taxa de Conversão"
          value={
            periodQuotes.length > 0
              ? `${((totalEmitidos / periodQuotes.length) * 100).toFixed(1)}%`
              : "0%"
          }
          subtext={`${totalEmitidos} emitidas / ${periodQuotes.length} cotações`}
        />

        <MetricCard
          icon={DollarSign}
          iconColor="text-text-secondary"
          iconBg="bg-bg-elevated"
          label="Ticket Médio"
          value={
            totalEmitidos > 0
              ? formatBRL(totalRevenue / totalEmitidos)
              : "R$ 0,00"
          }
          subtext={`Baseado em ${totalEmitidos} ${totalEmitidos === 1 ? "venda" : "vendas"}`}
        />

        <MetricCard
          icon={Users}
          iconColor="text-info"
          iconBg="bg-info-subtle"
          label="Vendedores Ativos"
          value={activeSellers.length}
          subtext={`${emFormacao} em formação`}
        />
      </div>

      {/* Margem da Equipe Comercial — cascata Receita → Custo → Comissão → Líquido */}
      <Card>
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-text-muted" />
              <h3 className="text-base font-semibold text-text-primary">
                Margem da Equipe Comercial
              </h3>
            </div>
            <Badge variant="outline">
              {margemEquipe.vendas}{" "}
              {margemEquipe.vendas === 1 ? "venda emitida" : "vendas emitidas"} no período
            </Badge>
          </div>
          <p className="text-xs text-text-muted">
            Quanto a operação gerou de verdade — sem inflar com pipeline ou aprovados
          </p>
        </div>

        <div className="p-6">
          {margemEquipe.vendas === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              Sem vendas emitidas no período selecionado.
            </div>
          ) : (
            <>
              {/* Receita Total — referência (100%) */}
              <div className="mb-4 pb-4 border-b border-border-subtle">
                <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                  <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-accent" />
                    Receita Total (100%)
                  </span>
                  <span className="text-2xl font-semibold text-text-primary tabular-nums">
                    {formatBRL(margemEquipe.receitaTotal)}
                  </span>
                </div>
                <div className="w-full bg-accent h-2 rounded-full" />
              </div>

              {/* Custo Direto */}
              <div className="mb-3">
                <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                  <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-danger" />
                    Custo Direto (milhas + taxas)
                  </span>
                  <div className="text-right">
                    <span className="font-semibold text-danger tabular-nums">
                      −{formatBRL(margemEquipe.custoTotal)}
                    </span>
                    <span className="text-xs text-text-muted ml-2 tabular-nums">
                      {margemEquipe.pctCusto.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-danger h-2 transition-all duration-700"
                    style={{ width: `${Math.min(100, margemEquipe.pctCusto)}%` }}
                  />
                </div>
              </div>

              {/* Margem Bruta (antes das comissões) */}
              <div className="mb-4 pb-4 border-b border-border-subtle">
                <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                  <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-warning" />
                    Margem Bruta (antes das comissões)
                  </span>
                  <div className="text-right">
                    <span className="text-xl font-semibold text-warning tabular-nums">
                      {formatBRL(margemEquipe.margemBruta)}
                    </span>
                    <span className="text-xs text-warning font-medium ml-2 tabular-nums">
                      {margemEquipe.pctMargemBruta.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-warning h-2 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(0, margemEquipe.pctMargemBruta))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Comissões pagas */}
              <div className="mb-3">
                <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                  <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-info" />
                    Comissões pagas aos vendedores
                  </span>
                  <div className="text-right">
                    <span className="font-semibold text-info tabular-nums">
                      −{formatBRL(margemEquipe.comissaoTotal)}
                    </span>
                    <span className="text-xs text-text-muted ml-2 tabular-nums">
                      {margemEquipe.pctComissoes.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-info h-2 transition-all duration-700"
                    style={{ width: `${Math.min(100, margemEquipe.pctComissoes)}%` }}
                  />
                </div>
              </div>

              {/* Margem Líquida — destaque final */}
              <div className="mt-4 bg-success-subtle border border-success/30 rounded-lg p-4">
                <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-success font-medium">
                      Margem Líquida da Agência
                    </p>
                    <p className="text-xs text-text-muted">
                      O que sobra de fato para a PCD após pagar custos + comissões
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "text-3xl font-semibold tabular-nums",
                        margemEquipe.margemLiquida >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {formatBRL(margemEquipe.margemLiquida)}
                    </span>
                    <div
                      className={cn(
                        "text-xs font-medium tabular-nums",
                        margemEquipe.margemLiquida >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {margemEquipe.pctMargemLiquida.toFixed(1)}% da receita
                    </div>
                  </div>
                </div>

                {margemEquipe.pctMargemLiquida >= 30 && (
                  <div className="mt-2 text-xs text-success flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Margem saudável — operação rentável
                  </div>
                )}
                {margemEquipe.pctMargemLiquida >= 15 &&
                  margemEquipe.pctMargemLiquida < 30 && (
                    <div className="mt-2 text-xs text-warning flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      Margem moderada — atenção aos descontos
                    </div>
                  )}
                {margemEquipe.pctMargemLiquida < 15 &&
                  margemEquipe.pctMargemLiquida >= 0 && (
                    <div className="mt-2 text-xs text-warning flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      Margem apertada — revisar precificação
                    </div>
                  )}
                {margemEquipe.pctMargemLiquida < 0 && (
                  <div className="mt-2 text-xs text-danger flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-danger" />
                    Operação no prejuízo — comissões maiores que a margem bruta
                  </div>
                )}
              </div>

              {/* Sumário por venda */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border-subtle">
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                    Ticket médio
                  </p>
                  <p className="text-base font-semibold text-text-primary tabular-nums">
                    {formatBRL(margemEquipe.receitaTotal / Math.max(1, margemEquipe.vendas))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                    Lucro / venda
                  </p>
                  <p className="text-base font-semibold text-warning tabular-nums">
                    {formatBRL(margemEquipe.margemBruta / Math.max(1, margemEquipe.vendas))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                    Líquido / venda
                  </p>
                  <p
                    className={cn(
                      "text-base font-semibold tabular-nums",
                      margemEquipe.margemLiquida >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {formatBRL(margemEquipe.margemLiquida / Math.max(1, margemEquipe.vendas))}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Row 2 — Gráfico + Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-text-muted" />
                Cotações vs Vendas
              </h3>
              <p className="text-xs text-text-muted mt-1">
                Últimos {periodDates.days} dias · Vendas conta apenas orçamentos Emitidos
              </p>
            </div>
          </div>

          <div className="relative h-64 mt-2">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[100, 75, 50, 25, 0].map((pct) => (
                <div key={pct} className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted w-6 text-right tabular-nums">
                    {Math.ceil((maxValue * pct) / 100)}
                  </span>
                  <div className="flex-1 border-t border-dashed border-border-subtle" />
                </div>
              ))}
            </div>

            <div className="absolute inset-0 ml-8 flex items-end gap-1 pb-6">
              {chartData.map((day, idx) => {
                const cotPct = (day.cotacoes / maxValue) * 100;
                const venPct = (day.vendas / maxValue) * 100;
                const showLabel =
                  idx % Math.max(1, Math.ceil(chartData.length / 8)) === 0 ||
                  idx === chartData.length - 1;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center min-w-0 group relative"
                  >
                    <div className="w-full flex items-end justify-center gap-0.5 h-full">
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-bg-overlay text-text-primary text-xs rounded-md px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-md border border-border">
                        <div className="font-medium">{day.label}</div>
                        <div className="text-accent tabular-nums">Cotações: {day.cotacoes}</div>
                        <div className="text-success tabular-nums">Vendas: {day.vendas}</div>
                      </div>

                      <div
                        className="bg-accent rounded-t-sm transition-colors"
                        style={{
                          height: `${cotPct}%`,
                          width: "40%",
                          minHeight: day.cotacoes > 0 ? "3px" : "0",
                        }}
                      />
                      <div
                        className="bg-success rounded-t-sm transition-colors"
                        style={{
                          height: `${venPct}%`,
                          width: "40%",
                          minHeight: day.vendas > 0 ? "3px" : "0",
                        }}
                      />
                    </div>
                    {showLabel && (
                      <span className="text-[10px] text-text-muted mt-1.5 whitespace-nowrap tabular-nums">
                        {day.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle flex-wrap gap-2">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-accent" />
                <span className="text-xs font-medium text-text-secondary">
                  Cotações criadas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-success" />
                <span className="text-xs font-medium text-text-secondary">
                  Vendas emitidas
                </span>
              </div>
            </div>
            <div className="text-xs text-text-muted">
              <span className="font-semibold text-text-primary tabular-nums">{totalCotacoes}</span>{" "}
              cotações
              <span className="mx-2 text-border-strong">·</span>
              <span className="font-semibold text-text-primary tabular-nums">{totalVendas}</span>{" "}
              vendas
              <span className="mx-2 text-border-strong">·</span>
              <span className="font-semibold text-success tabular-nums">{conversao}%</span>{" "}
              conversão
            </div>
          </div>
        </Card>

        {/* Meta Comercial */}
        <MetaCard
          metaAtual={metaAtual}
          receitaMes={receitaMes}
          navigate={navigate}
        />
      </div>

      {/* Row 3 — Funil + Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            Funil de Conversão
          </h3>

          <div className="space-y-3">
            {funil.map((stage, idx) => {
              const pct =
                periodQuotes.length > 0
                  ? (stage.count / periodQuotes.length) * 100
                  : 0;
              return (
                <div key={idx}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium text-text-secondary">{stage.label}</span>
                    <span className="text-sm text-text-primary">
                      <strong className="tabular-nums">{stage.count}</strong>
                      <span className="text-xs text-text-muted ml-1 tabular-nums">
                        ({pct.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(stage.color, "h-2 rounded-full transition-all duration-700")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-3 p-6">
          <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-text-muted" />
            Ranking de Vendedores —{" "}
            {periodo === "7"
              ? "Últimos 7 dias"
              : periodo === "15"
                ? "Últimos 15 dias"
                : "Período"}
          </h3>

          {topPerformers.length === 0 ? (
            <p className="text-center text-text-muted py-6 text-sm">
              Nenhum vendedor com atividade no período.
            </p>
          ) : (
            <div className="space-y-1">
              {topPerformers.map((seller, idx) => (
                <div
                  key={seller.id}
                  onClick={() => navigate(`/gerente/vendedores/${seller.id}`)}
                  className="flex items-center gap-3 p-3 rounded-md hover:bg-bg-elevated cursor-pointer transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 tabular-nums",
                      idx === 0 && "bg-warning-subtle text-warning",
                      idx === 1 && "bg-bg-elevated text-text-secondary",
                      idx === 2 && "bg-brand-subtle text-brand",
                      idx > 2 && "bg-bg-elevated text-text-muted",
                    )}
                  >
                    {idx + 1}
                  </div>

                  <div className="w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center font-medium text-xs text-text-secondary shrink-0">
                    {initials(seller.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-text-primary truncate">{seller.name}</p>
                    <div className="w-full bg-bg-elevated rounded-full h-1.5 mt-1">
                      <div
                        className="bg-brand h-1.5 rounded-full"
                        style={{
                          width: `${(seller.receita / maxSellerRevenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm text-text-primary tabular-nums">
                      {formatBRL(seller.receita)}
                    </p>
                    <p className="text-[10px] text-text-muted tabular-nums">
                      {seller.vendas} vendas / {seller.cotacoes} cotações
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row 4 — Atividade Recente */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-text-muted" />
          Atividade Recente
        </h3>

        {recentActivity.length === 0 ? (
          <p className="text-center text-text-muted py-6 text-sm">
            Nenhuma atividade registrada ainda.
          </p>
        ) : (
          <div className="space-y-1">
            {recentActivity.map((ev, idx) => {
              const trecho = ev.quote.itinerary?.trechos?.[0];
              const seg = trecho?.segmentos?.[0];
              const origem = seg?.origem_iata || trecho?.origem_iata || "";
              const destino = seg?.destino_iata || trecho?.destino_iata || "";
              const rota = origem && destino ? `${origem} → ${destino}` : "";
              const EvIcon = ev.icon;

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0"
                >
                  <EvIcon className={cn("w-4 h-4 shrink-0", ev.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-secondary">
                      <span className={cn("font-medium", ev.color)}>
                        {ev.quote.seller_name || "—"}
                      </span>{" "}
                      {ev.label}{" "}
                      <span className="font-mono text-xs text-text-muted">
                        {ev.quote.quote_number}
                      </span>
                      {rota && (
                        <span className="text-text-muted"> · {rota}</span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      {formatBRL(ev.quote.total_value)}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
                    {timeAgo(ev.date)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, iconColor, iconBg, label, value, subtext, extra, badge }) {
  return (
    <div className="bg-bg-surface rounded-md border border-border p-5 transition-colors hover:bg-bg-elevated">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        {badge && (
          <span className="text-xs text-text-muted font-medium tabular-nums">{badge}</span>
        )}
      </div>
      <p className="text-3xl font-semibold text-text-primary mb-0.5 tabular-nums">{value}</p>
      <p className="text-xs text-text-muted font-medium">{label}</p>
      {subtext && <p className="text-xs text-text-muted mt-2 tabular-nums">{subtext}</p>}
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

function MetaCard({ metaAtual, receitaMes, navigate }) {
  const now = new Date();
  if (!metaAtual) {
    return (
      <Card className="lg:col-span-2 p-6 flex flex-col items-center justify-center text-center">
        <Target className="w-12 h-12 text-text-disabled mb-3" />
        <p className="text-sm text-text-muted mb-3">
          Nenhuma meta para{" "}
          {now.toLocaleDateString("pt-BR", { month: "long" })}
        </p>
        <Button variant="outline" onClick={() => navigate("/gerente/metas")}>
          Definir meta <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </Card>
    );
  }

  const target = Number(metaAtual.monthly_target) || 0;
  const pct = target > 0 ? Math.min(100, (receitaMes / target) * 100) : 0;
  const faltam = Math.max(0, target - receitaMes);

  const diasMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const diaAtual = now.getDate();
  const diasRestantes = Math.max(0, diasMes - diaAtual);
  const mediaDiaria = diaAtual > 0 ? receitaMes / diaAtual : 0;
  const necessarioDia = diasRestantes > 0 ? faltam / diasRestantes : 0;

  return (
    <Card className="lg:col-span-2 p-6">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-text-muted" />
        <h3 className="text-base font-semibold text-text-primary">Meta Comercial Ativa</h3>
      </div>
      <p className="text-lg font-semibold text-text-primary mb-1">
        {metaAtual.month_label || metaAtual.month}
      </p>
      <p className="text-xs text-text-muted mb-4">
        Meta mensal · {metaAtual.month}
      </p>

      <div className="relative w-40 h-40 mx-auto mb-3">
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="hsl(var(--bg-elevated))"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={pct >= 100 ? "hsl(var(--success))" : "hsl(var(--warning))"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(pct * Math.PI * 84) / 100} ${Math.PI * 84}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-semibold tabular-nums", pct >= 100 ? "text-success" : "text-warning")}>
            {Math.round(pct)}%
          </span>
          <span className="text-[10px] text-text-muted tracking-widest">ATINGIDO</span>
        </div>
      </div>

      <div className="text-center mb-3">
        <p className="text-lg font-semibold text-text-primary tabular-nums">{formatBRL(receitaMes)}</p>
        <p className="text-xs text-text-muted tabular-nums">de {formatBRL(target)}</p>
      </div>

      {pct >= 100 ? (
        <div className="bg-success-subtle border border-success/30 rounded-md px-3 py-2 text-sm text-center text-success">
          <strong>Meta atingida!</strong>
        </div>
      ) : faltam > 0 ? (
        <div className="bg-warning-subtle border border-warning/30 rounded-md px-3 py-2 text-sm text-center text-text-secondary">
          Faltam{" "}
          <strong className="text-warning tabular-nums">{formatBRL(faltam)}</strong>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div>
          <p className="text-text-muted">Média atual</p>
          <p className="font-semibold text-text-primary tabular-nums">{formatBRL(mediaDiaria)}/dia</p>
        </div>
        <div>
          <p className="text-text-muted">Necessário</p>
          <p
            className={cn(
              "font-semibold tabular-nums",
              mediaDiaria >= necessarioDia ? "text-success" : "text-danger",
            )}
          >
            {formatBRL(necessarioDia)}/dia
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/gerente/metas")}
        className="w-full mt-4"
      >
        Ver escada completa <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </Card>
  );
}
