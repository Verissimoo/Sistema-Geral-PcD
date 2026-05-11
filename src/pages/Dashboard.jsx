import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, CheckCircle2, TrendingUp, DollarSign, Users,
  Calendar, Target, Trophy, BarChart3, Filter, Activity, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { filterCommercialQuotes } from "@/lib/commercialFilter";
import {
  getMonthRevenue, getRevenueQuotesInPeriod, APPROVED_PIPELINE_STATUSES,
} from "@/lib/revenueHelper";

const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const [allQuotes, setAllQuotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    Promise.all([
      localClient.entities.Quotes.list(),
      localClient.entities.Users.list(),
      localClient.entities.CommercialGoals.list(),
    ]).then(([qs, us, gs]) => {
      setAllQuotes(qs || []);
      setUsers(us || []);
      setGoals(gs || []);
    });
  }, []);

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
      {
        label: "Em negociação",
        count: negociacao.length,
        color: "bg-blue-500",
      },
      { label: "Aprovadas", count: aprovadas.length, color: "bg-amber-500" },
      {
        label: "Aguardando emissão",
        count: aguardando.length,
        color: "bg-orange-500",
      },
      {
        label: "Emitidas (receita)",
        count: emitidas.length,
        color: "bg-emerald-500",
      },
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
          icon: "📄",
          color: "text-blue-600",
          label: "criou orçamento",
        });
      }
      if (q.status === "Emitido" && (q.emission_completed_date || q.issued_date)) {
        events.push({
          type: "issued",
          date: q.emission_completed_date || q.issued_date,
          quote: q,
          icon: "✅",
          color: "text-emerald-600",
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
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Gerencial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral da operação — PassagensComDesconto
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
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
              <span className="text-muted-foreground">até</span>
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
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          label="Cotações"
          value={periodQuotes.length}
          subtext="No período selecionado"
          badge={`${periodDates.days}d`}
        />

        <MetricCard
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          label="Vendas Emitidas"
          value={totalEmitidos}
          subtext={formatBRL(totalRevenue)}
          extra={
            pipelineQuotes.length > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                + {pipelineQuotes.length} em pipeline ({formatBRL(pipelineValue)})
              </span>
            )
          }
        />

        <MetricCard
          icon={TrendingUp}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
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
          iconColor="text-slate-700"
          iconBg="bg-slate-100"
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
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          label="Vendedores Ativos"
          value={activeSellers.length}
          subtext={`${emFormacao} em formação`}
        />
      </div>

      {/* Row 2 — Gráfico + Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-700" />
                Cotações vs Vendas
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Últimos {periodDates.days} dias · Vendas conta apenas orçamentos Emitidos
              </p>
            </div>
          </div>

          <div className="relative h-64 mt-2">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[100, 75, 50, 25, 0].map((pct) => (
                <div key={pct} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-6 text-right">
                    {Math.ceil((maxValue * pct) / 100)}
                  </span>
                  <div className="flex-1 border-t border-dashed border-slate-200" />
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
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                        <div className="font-semibold">{day.label}</div>
                        <div className="text-blue-300">Cotações: {day.cotacoes}</div>
                        <div className="text-emerald-300">Vendas: {day.vendas}</div>
                      </div>

                      <div
                        className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm hover:from-blue-600 hover:to-blue-500 transition-all"
                        style={{
                          height: `${cotPct}%`,
                          width: "40%",
                          minHeight: day.cotacoes > 0 ? "3px" : "0",
                        }}
                      />
                      <div
                        className="bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm hover:from-emerald-600 hover:to-emerald-500 transition-all"
                        style={{
                          height: `${venPct}%`,
                          width: "40%",
                          minHeight: day.vendas > 0 ? "3px" : "0",
                        }}
                      />
                    </div>
                    {showLabel && (
                      <span className="text-[10px] text-slate-500 mt-1.5 whitespace-nowrap">
                        {day.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-blue-500 to-blue-400" />
                <span className="text-xs font-medium text-slate-700">
                  Cotações criadas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-emerald-500 to-emerald-400" />
                <span className="text-xs font-medium text-slate-700">
                  Vendas emitidas
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              <span className="font-bold text-slate-900">{totalCotacoes}</span>{" "}
              cotações
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-bold text-slate-900">{totalVendas}</span>{" "}
              vendas
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-bold text-emerald-600">{conversao}%</span>{" "}
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
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-700" />
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
                    <span className="text-sm font-medium">{stage.label}</span>
                    <span className="text-sm">
                      <strong>{stage.count}</strong>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({pct.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Ranking de Vendedores —{" "}
            {periodo === "7"
              ? "Últimos 7 dias"
              : periodo === "15"
                ? "Últimos 15 dias"
                : "Período"}
          </h3>

          {topPerformers.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhum vendedor com atividade no período.
            </p>
          ) : (
            <div className="space-y-2">
              {topPerformers.map((seller, idx) => (
                <div
                  key={seller.id}
                  onClick={() => navigate(`/gerente/vendedores/${seller.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                      idx === 0 && "bg-amber-100 text-amber-700",
                      idx === 1 && "bg-slate-200 text-slate-700",
                      idx === 2 && "bg-orange-100 text-orange-700",
                      idx > 2 && "bg-slate-100 text-slate-500",
                    )}
                  >
                    {idx + 1}
                  </div>

                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-semibold text-xs text-slate-700 shrink-0">
                    {initials(seller.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{seller.name}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-1.5 rounded-full"
                        style={{
                          width: `${(seller.receita / maxSellerRevenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">
                      {formatBRL(seller.receita)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
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
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-700" />
          Atividade Recente
        </h3>

        {recentActivity.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            Nenhuma atividade registrada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((ev, idx) => {
              const trecho = ev.quote.itinerary?.trechos?.[0];
              const seg = trecho?.segmentos?.[0];
              const origem = seg?.origem_iata || trecho?.origem_iata || "";
              const destino = seg?.destino_iata || trecho?.destino_iata || "";
              const rota = origem && destino ? `${origem} → ${destino}` : "";

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
                >
                  <span className="text-lg shrink-0">{ev.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className={cn("font-semibold", ev.color)}>
                        {ev.quote.seller_name || "—"}
                      </span>{" "}
                      {ev.label}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {ev.quote.quote_number}
                      </span>
                      {rota && (
                        <span className="text-muted-foreground"> · {rota}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBRL(ev.quote.total_value)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
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
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {badge && (
          <span className="text-xs text-slate-400 font-medium">{badge}</span>
        )}
      </div>
      <p className="text-3xl font-black text-slate-900 mb-0.5">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

function MetaCard({ metaAtual, receitaMes, navigate }) {
  const now = new Date();
  if (!metaAtual) {
    return (
      <Card className="lg:col-span-2 p-6 flex flex-col items-center justify-center text-center">
        <Target className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-sm text-muted-foreground mb-3">
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
    <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-amber-400" />
        <h3 className="font-bold text-base">Meta Comercial Ativa</h3>
      </div>
      <p className="text-xl font-bold mb-1">
        {metaAtual.month_label || metaAtual.month}
      </p>
      <p className="text-xs text-slate-300 mb-4">
        Meta mensal · {metaAtual.month}
      </p>

      <div className="relative w-40 h-40 mx-auto mb-3">
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={pct >= 100 ? "#10B981" : "#F4A224"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(pct * Math.PI * 84) / 100} ${Math.PI * 84}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-black", pct >= 100 ? "text-emerald-400" : "text-amber-400")}>
            {Math.round(pct)}%
          </span>
          <span className="text-[10px] text-slate-400 tracking-widest">ATINGIDO</span>
        </div>
      </div>

      <div className="text-center mb-3">
        <p className="text-xl font-bold">{formatBRL(receitaMes)}</p>
        <p className="text-xs text-slate-400">de {formatBRL(target)}</p>
      </div>

      {pct >= 100 ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-sm text-center">
          🎉 <strong className="text-emerald-400">Meta atingida!</strong>
        </div>
      ) : faltam > 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-sm text-center">
          Faltam{" "}
          <strong className="text-amber-400">{formatBRL(faltam)}</strong>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div>
          <p className="text-slate-400">Média atual</p>
          <p className="font-bold">{formatBRL(mediaDiaria)}/dia</p>
        </div>
        <div>
          <p className="text-slate-400">Necessário</p>
          <p
            className={cn(
              "font-bold",
              mediaDiaria >= necessarioDia
                ? "text-emerald-400"
                : "text-red-400",
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
        className="w-full mt-4 bg-transparent border-white/20 hover:bg-white/10 text-white"
      >
        Ver escada completa <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </Card>
  );
}
