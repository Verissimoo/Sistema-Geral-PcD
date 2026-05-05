import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, ShoppingCart, TrendingUp, DollarSign, Users,
  Calendar, Target, Trophy, Send, CheckCircle2, FileStack, X, Ban,
  AlertTriangle, Plus, ArrowRight, Activity, Crown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { CAREER_LEVELS } from "@/lib/careerPlan";

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtTodayBR = () =>
  new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

const fmtDayShort = (d) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isSameMonth = (date, ref = new Date()) =>
  date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();

const timeAgo = (iso) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

const STATUS_CONFIG = {
  Enviado: { color: "blue", icon: Send, label: "Enviados" },
  Aprovado: { color: "emerald", icon: CheckCircle2, label: "Aprovados" },
  Emitido: { color: "purple", icon: FileStack, label: "Emitidos" },
  Recusado: { color: "red", icon: X, label: "Recusados" },
  Cancelado: { color: "gray", icon: Ban, label: "Cancelados" },
};

const COLOR_CLASSES = {
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  red: "bg-red-100 text-red-700 border-red-200",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [goals, setGoals] = useState([]);
  const [periodo, setPeriodo] = useState("30");
  const [periodoCustom, setPeriodoCustom] = useState({ start: "", end: "" });

  useEffect(() => {
    (async () => {
      const usersList = await localClient.entities.Users.list();
      setUsers(usersList || []);
    })();
    setQuotes(localClient.entities.Quotes.list());
    setGoals(localClient.entities.CommercialGoals.list());
  }, []);

  // ── Filtro de período ──────────────────────────────────────────────
  const periodRange = useMemo(() => {
    const now = new Date();
    if (periodo === "custom") {
      const start = periodoCustom.start
        ? new Date(periodoCustom.start + "T00:00:00")
        : new Date(0);
      const end = periodoCustom.end
        ? new Date(periodoCustom.end + "T23:59:59")
        : now;
      return { start, end };
    }
    const days = parseInt(periodo);
    const start = new Date(now);
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }, [periodo, periodoCustom]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const d = new Date(q.created_date);
      return d >= periodRange.start && d <= periodRange.end;
    });
  }, [quotes, periodRange]);

  // ── Métricas ──────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);

  const metrics = useMemo(() => {
    // "Cotações Hoje / Ontem" são sempre referentes ao dia (independente do filtro)
    const cotacoesHoje = quotes.filter((q) =>
      isSameDay(new Date(q.created_date), today)
    ).length;
    const cotacoesOntem = quotes.filter((q) =>
      isSameDay(new Date(q.created_date), yesterday)
    ).length;

    // Demais métricas seguem o período selecionado
    const vendasPeriodo = filteredQuotes.filter(
      (q) => q.status === "Aprovado" || q.status === "Emitido"
    );
    const receitaPeriodo = vendasPeriodo.reduce((s, q) => s + (q.total_value || 0), 0);
    const taxaConv = filteredQuotes.length > 0
      ? Math.round((vendasPeriodo.length / filteredQuotes.length) * 100)
      : 0;
    const ticketMedio = vendasPeriodo.length > 0
      ? receitaPeriodo / vendasPeriodo.length
      : 0;

    const vendedoresAtivos = users.filter(
      (u) => u.role === "vendedor" && u.status === "Ativo"
    );
    const emFormacao = vendedoresAtivos.filter(
      (u) => (u.career_level || "N0") === "N0"
    ).length;

    return {
      cotacoesHoje,
      cotacoesOntem,
      vendasMes: vendasPeriodo.length,
      receitaMes: receitaPeriodo,
      cotacoesMesTotal: filteredQuotes.length,
      taxaConv,
      ticketMedio,
      vendedoresAtivos: vendedoresAtivos.length,
      emFormacao,
    };
  }, [quotes, filteredQuotes, users, today, yesterday]);

  // ── Série de barras adaptativa ao período ─────────────────────────
  const chartData = useMemo(() => {
    const start = new Date(periodRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(periodRange.end);
    end.setHours(23, 59, 59, 999);
    const totalDays = Math.max(1, Math.ceil((end - start) / 86400000));

    // Agrupa por semana se > 30 dias, senão por dia
    const groupByWeek = totalDays > 30;
    const buckets = [];

    if (groupByWeek) {
      const numWeeks = Math.ceil(totalDays / 7);
      for (let i = 0; i < numWeeks; i++) {
        const bStart = new Date(start);
        bStart.setDate(bStart.getDate() + i * 7);
        const bEnd = new Date(bStart);
        bEnd.setDate(bEnd.getDate() + 6);
        bEnd.setHours(23, 59, 59, 999);
        if (bStart > end) break;
        const cot = filteredQuotes.filter((q) => {
          const d = new Date(q.created_date);
          return d >= bStart && d <= bEnd;
        }).length;
        const sales = filteredQuotes.filter((q) => {
          const d = new Date(q.created_date);
          return (
            d >= bStart && d <= bEnd &&
            (q.status === "Aprovado" || q.status === "Emitido")
          );
        }).length;
        buckets.push({
          label: `${bStart.getDate()}/${bStart.getMonth() + 1}`,
          cot, sales,
        });
      }
    } else {
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        if (d > end) break;
        const cot = filteredQuotes.filter((q) => isSameDay(new Date(q.created_date), d)).length;
        const sales = filteredQuotes.filter((q) => {
          const qd = new Date(q.created_date);
          return isSameDay(qd, d) && (q.status === "Aprovado" || q.status === "Emitido");
        }).length;
        buckets.push({
          label: fmtDayShort(d),
          cot, sales,
        });
      }
    }

    const max = Math.max(1, ...buckets.map((b) => Math.max(b.cot, b.sales)));
    const totalCot = buckets.reduce((s, b) => s + b.cot, 0);
    const totalSales = buckets.reduce((s, b) => s + b.sales, 0);
    const conv = totalCot > 0 ? Math.round((totalSales / totalCot) * 100) : 0;
    return { buckets, max, totalCot, totalSales, conv, groupByWeek };
  }, [filteredQuotes, periodRange]);

  // ── Meta do mês atual (real do calendário), com fallback à "Ativa" ─
  const currentMonthYM = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const activeGoal = useMemo(
    () =>
      goals.find((g) => g.month === currentMonthYM) ||
      goals.find((g) => g.status === "Ativa"),
    [goals, currentMonthYM]
  );

  const goalStats = useMemo(() => {
    if (!activeGoal?.month) return null;
    const [y, m] = activeGoal.month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    const totalDays = end.getDate();
    const todayDate = new Date();
    const monthStarted = todayDate >= start;
    const monthEnded = todayDate > end;
    const elapsedDays = monthEnded
      ? totalDays
      : monthStarted
      ? Math.max(1, todayDate.getDate())
      : 0;
    const remainingDays = Math.max(0, totalDays - elapsedDays);

    const sold = quotes
      .filter((q) => {
        const d = new Date(q.created_date);
        return (
          d >= start && d <= end && (q.status === "Aprovado" || q.status === "Emitido")
        );
      })
      .reduce((s, q) => s + (q.total_value || 0), 0);

    const target = Number(activeGoal.monthly_target) || 0;
    const pct = target > 0 ? Math.min(100, (sold / target) * 100) : 0;
    const missing = Math.max(0, target - sold);
    const dailyAvg = elapsedDays > 0 ? sold / elapsedDays : 0;
    const dailyNeeded = remainingDays > 0 ? missing / remainingDays : 0;

    return { sold, target, pct, missing, dailyAvg, dailyNeeded };
  }, [activeGoal, quotes]);

  // ── Status counts (no período) ────────────────────────────────────
  const statusCounts = useMemo(() => {
    const out = {};
    Object.keys(STATUS_CONFIG).forEach((s) => {
      const list = filteredQuotes.filter((q) => q.status === s);
      out[s] = {
        count: list.length,
        total: list.reduce((sum, q) => sum + (q.total_value || 0), 0),
      };
    });
    return out;
  }, [filteredQuotes]);

  // ── Ranking vendedores (no período) ───────────────────────────────
  const ranking = useMemo(() => {
    const map = {};
    filteredQuotes.forEach((q) => {
      if (!q.seller_id) return;
      if (q.status !== "Aprovado" && q.status !== "Emitido") return;
      if (!map[q.seller_id]) {
        map[q.seller_id] = { id: q.seller_id, revenue: 0, sales: 0, name: q.seller_name };
      }
      map[q.seller_id].revenue += q.total_value || 0;
      map[q.seller_id].sales += 1;
    });
    const list = Object.values(map).map((s) => {
      const u = users.find((x) => x.id === s.id);
      return {
        ...s,
        name: u?.name || s.name || "—",
        career_level: u?.career_level || "N0",
      };
    });
    list.sort((a, b) => b.revenue - a.revenue);
    return list.slice(0, 7);
  }, [filteredQuotes, users]);

  const maxRevenue = ranking[0]?.revenue || 1;

  // ── Atividade recente (no período) ────────────────────────────────
  const activity = useMemo(() => {
    const events = [];
    filteredQuotes.forEach((q) => {
      events.push({
        type: "create",
        date: q.created_date,
        text: `${q.seller_name || "—"} criou orçamento ${q.quoteNumber || ""} — ${q.client?.name || ""} · ${formatBRL(q.total_value)}`,
        icon: FileText,
        color: "text-blue-600",
      });
      ["aprovado_date", "emitido_date", "recusado_date", "cancelado_date"].forEach((field) => {
        if (q[field]) {
          const status = field.replace("_date", "");
          const cap = status.charAt(0).toUpperCase() + status.slice(1);
          const cfg = STATUS_CONFIG[cap];
          events.push({
            type: "status",
            date: q[field],
            text: `${q.seller_name || "—"} alterou ${q.quoteNumber || ""} para ${cap} · ${formatBRL(q.total_value)}`,
            icon: cfg?.icon || CheckCircle2,
            color:
              cap === "Aprovado" ? "text-emerald-600" :
              cap === "Emitido" ? "text-purple-600" :
              cap === "Recusado" ? "text-red-600" :
              "text-gray-600",
          });
        }
      });
    });
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return events.slice(0, 10);
  }, [filteredQuotes]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Gerencial</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral da operação — PassagensComDesconto
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
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
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={periodoCustom.start}
                onChange={(e) =>
                  setPeriodoCustom((p) => ({ ...p, start: e.target.value }))
                }
                className="w-[150px]"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={periodoCustom.end}
                onChange={(e) =>
                  setPeriodoCustom((p) => ({ ...p, end: e.target.value }))
                }
                className="w-[150px]"
              />
            </div>
          )}
          <Badge variant="outline" className="gap-2 px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {fmtTodayBR()}
          </Badge>
        </div>
      </div>

      {/* Row 1 — Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          icon={<FileText className="h-4 w-4" />}
          label="Cotações Hoje"
          value={metrics.cotacoesHoje}
          subtext={`${metrics.cotacoesOntem} ontem`}
          color="text-blue-600"
        />
        <MetricCard
          icon={<ShoppingCart className="h-4 w-4" />}
          label="Vendas do Mês"
          value={metrics.vendasMes}
          subtext={`${formatBRL(metrics.receitaMes)} em receita`}
          color="text-emerald-600"
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Taxa de Conversão"
          value={`${metrics.taxaConv}%`}
          subtext={`${metrics.cotacoesMesTotal} cotações → ${metrics.vendasMes} vendas`}
          color="text-amber-600"
        />
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Ticket Médio"
          value={formatBRL(metrics.ticketMedio)}
          subtext={`Baseado em ${metrics.vendasMes} vendas`}
          color="text-[#0B1E3D] dark:text-blue-400"
        />
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Vendedores Ativos"
          value={metrics.vendedoresAtivos}
          subtext={`${metrics.emFormacao} em formação`}
          color="text-purple-600"
        />
      </div>

      {/* Row 2 — Gráfico + Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Chart */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Cotações vs Vendas
              <span className="text-xs font-normal text-muted-foreground">
                ({periodo === "custom"
                  ? "período personalizado"
                  : `últimos ${periodo} dias`})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={chartData} />
          </CardContent>
        </Card>

        {/* Meta ativa */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Meta Comercial Ativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeGoal && goalStats ? (
              <ActiveGoal goal={activeGoal} stats={goalStats} />
            ) : (
              <div className="text-center py-6 space-y-3">
                <Target className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">Nenhuma meta comercial ativa</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/gerente/metas")}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Criar meta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Status + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileStack className="h-4 w-4 text-primary" />
              Cotações por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                const data = statusCounts[status];
                const Icon = cfg.icon;
                const pendingAttention = status === "Enviado" && data.count > 0;
                return (
                  <button
                    key={status}
                    onClick={() => navigate(`/gerente/orcamentos?status=${encodeURIComponent(status)}`)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all hover:shadow-md",
                      COLOR_CLASSES[cfg.color],
                      pendingAttention && "ring-2 ring-amber-400 shadow-amber-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {pendingAttention && (
                        <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[9px] h-4 px-1.5 border-0">
                          Atenção
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">
                      {cfg.label}
                    </div>
                    <div className="font-bold text-xl mt-0.5">{data.count}</div>
                    <div className="text-[11px] opacity-80 truncate">
                      {formatBRL(data.total)}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Ranking de Vendedores — Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhuma venda registrada este mês.
              </div>
            ) : (
              <div className="space-y-2.5">
                {ranking.map((s, i) => (
                  <RankRow
                    key={s.id}
                    pos={i + 1}
                    seller={s}
                    maxRevenue={maxRevenue}
                    isFirst={i === 0}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Atividade */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Últimas Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Nenhuma atividade registrada ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((ev, i) => {
                const Icon = ev.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors text-sm"
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className={cn("h-4 w-4", ev.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{ev.text}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {timeAgo(ev.date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Subcomponentes ────────────────────────────────────────────────

function MetricCard({ icon, label, value, subtext, color }) {
  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className={color}>{icon}</span>
          <span>{label}</span>
        </div>
        <div className={cn("font-bold text-2xl", color)}>{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtext}</div>
      </CardContent>
    </Card>
  );
}

function BarChart({ data }) {
  const showAllLabels = data.buckets.length <= 15;
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 md:gap-1.5 h-44">
        {data.buckets.map((b, i) => {
          const cotH = (b.cot / data.max) * 100;
          const salesH = (b.sales / data.max) * 100;
          const showLabel = showAllLabels || i % Math.ceil(data.buckets.length / 10) === 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-full flex items-end gap-0.5">
                <div
                  className="flex-1 rounded-t bg-blue-500/70 hover:bg-blue-500 transition-colors min-h-[2px]"
                  style={{ height: `${cotH}%` }}
                  title={`${b.label}: ${b.cot} cotações`}
                />
                <div
                  className="flex-1 rounded-t bg-emerald-500/70 hover:bg-emerald-500 transition-colors min-h-[2px]"
                  style={{ height: `${salesH}%` }}
                  title={`${b.label}: ${b.sales} vendas`}
                />
              </div>
              <div className="text-[9px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                {showLabel ? b.label : ""}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap pt-2 border-t border-border">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Cotações
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Vendas
          </span>
          {data.groupByWeek && (
            <span className="text-[10px] text-muted-foreground">(agrupado por semana)</span>
          )}
        </div>
        <div className="text-muted-foreground">
          Total: <strong>{data.totalCot}</strong> cotações ·{" "}
          <strong>{data.totalSales}</strong> vendas ·{" "}
          <strong>{data.conv}%</strong> conversão
        </div>
      </div>
    </div>
  );
}

function ActiveGoal({ goal, stats }) {
  const navigate = useNavigate();
  const reached = stats.pct >= 100;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (stats.pct / 100) * circumference;

  return (
    <div className="space-y-3">
      <div>
        <div className="font-semibold">{goal.month_label || goal.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Meta mensal · {goal.month}
        </div>
      </div>

      <div className="flex justify-center py-2">
        <div className="relative h-[160px] w-[160px]">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
            <circle
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={reached ? "#10B981" : "#F59E0B"}
              strokeWidth="10"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold">{stats.pct.toFixed(0)}%</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
              atingido
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-sm">
        <div className="font-bold">{formatBRL(stats.sold)}</div>
        <div className="text-xs text-muted-foreground">de {formatBRL(stats.target)}</div>
      </div>

      {reached ? (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm text-center font-semibold">
          🎉 Meta atingida!
        </div>
      ) : (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs text-center">
          Faltam <strong>{formatBRL(stats.missing)}</strong>
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center">
        Média diária: <strong>{formatBRL(stats.dailyAvg)}</strong>
        {!reached && (
          <>
            {" · "}Necessário: <strong>{formatBRL(stats.dailyNeeded)}/dia</strong>
          </>
        )}
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => navigate("/gerente/metas")}
        className="w-full gap-1 text-xs"
      >
        Ver escada completa <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

function RankRow({ pos, seller, maxRevenue, isFirst }) {
  const pct = (seller.revenue / maxRevenue) * 100;
  const levelData = CAREER_LEVELS.find((l) => l.level === seller.career_level);
  return (
    <div
      className={cn(
        "p-2.5 rounded-lg border transition-all",
        isFirst
          ? "border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/40 dark:from-amber-500/10 dark:to-amber-500/5 shadow-md shadow-amber-500/10"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
            isFirst
              ? "bg-amber-500 text-white"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isFirst ? <Crown className="h-3.5 w-3.5" /> : pos}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{seller.name}</span>
            {levelData && (
              <Badge
                style={{ background: levelData.color }}
                className="text-white text-[9px] h-4 px-1.5 border-0"
              >
                {seller.career_level}
              </Badge>
            )}
          </div>
          <div className="mt-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  isFirst ? "bg-amber-500" : "bg-primary"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-sm">{formatBRL(seller.revenue)}</div>
          <div className="text-[10px] text-muted-foreground">{seller.sales} vendas</div>
        </div>
      </div>
    </div>
  );
}
