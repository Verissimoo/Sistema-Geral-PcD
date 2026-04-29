import { useState, useEffect, useMemo } from "react";
import {
  Target, TrendingUp, Calendar, CheckCircle2, Clock,
  Settings, Plus, Trash2, RotateCcw, AlertTriangle, Award,
  ChevronRight, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient, seedCommercialGoals } from "@/api/localClient";

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatBRLShort = (v) => {
  const n = Number(v || 0);
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(0)}k`;
  return formatBRL(n);
};

const monthMatches = (createdISO, monthStr) => {
  if (!createdISO || !monthStr) return false;
  const d = new Date(createdISO);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return ym === monthStr;
};

const getDaysInMonth = (monthStr) => {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

const getMonthBounds = (monthStr) => {
  const [y, m] = monthStr.split("-").map(Number);
  return {
    start: new Date(y, m - 1, 1),
    end: new Date(y, m, 0, 23, 59, 59),
  };
};

const STATUS_BADGE = {
  Ativa: "bg-amber-500 hover:bg-amber-500 text-white border-0",
  Futura: "bg-muted text-muted-foreground hover:bg-muted border",
  Concluída: "bg-emerald-500 hover:bg-emerald-500 text-white border-0",
};

const STRETCH_TRIGGERS = [
  {
    label: "Setembro forte",
    condition: "R$ 200k+, ticket >= R$ 2.500, margem >=15%, 10-12 produtivos",
    next: "Outubro pode perseguir R$ 250k",
  },
  {
    label: "Setembro excepcional",
    condition: "R$ 220k+, ticket ~R$ 3.000, 180-200 leads/semana, 14 produtivos",
    next: "Outubro pode perseguir R$ 300k aspiracional",
  },
];

export default function GerenteMetasComerciais() {
  const { toast } = useToast();
  const [goals, setGoals] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [editOpen, setEditOpen] = useState(false);

  const reload = () => {
    setGoals(localClient.entities.CommercialGoals.list());
    setQuotes(localClient.entities.Quotes.list());
  };

  useEffect(() => { reload(); }, []);

  // Ordena cronologicamente
  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => (a.month || "").localeCompare(b.month || "")),
    [goals]
  );

  const maxTarget = useMemo(
    () => Math.max(1, ...sortedGoals.map((g) => Number(g.monthly_target) || 0)),
    [sortedGoals]
  );

  const goalRevenue = (g) =>
    quotes
      .filter(
        (q) =>
          (q.status === "Aprovado" || q.status === "Emitido") &&
          monthMatches(q.created_date, g.month)
      )
      .reduce((s, q) => s + (q.total_value || 0), 0);

  const activeGoal = useMemo(
    () => sortedGoals.find((g) => g.status === "Ativa"),
    [sortedGoals]
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Escada de Crescimento</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            META-03 — Escada mensal de crescimento · Junho → Outubro 2026
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeGoal && (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-0 px-3 py-1.5">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Mês ativo: {activeGoal.month_label}
            </Badge>
          )}
          <Button onClick={() => setEditOpen(true)} variant="outline" className="gap-2">
            <Settings className="h-4 w-4" /> Editar escada
          </Button>
        </div>
      </div>

      {/* Card explicativo */}
      <Card className="border-0 bg-[#0B1E3D] text-white overflow-hidden">
        <CardContent className="p-6 md:p-7">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 shrink-0">
              <Sparkles className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-base leading-relaxed">
              A escada escolhida é <strong>agressiva, mas realista</strong>. Outubro tem meta
              oficial de <strong>R$ 200.000</strong>, mas a meta de gestão interna será{" "}
              <strong className="text-amber-400">R$ 220.000</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
              <strong>5 meses</strong>
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
              R$ 60k → R$ 220k
            </span>
            <span className="px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-200">
              Margem mínima: 15%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Escada visual */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" /> Escada visual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end h-auto md:h-[360px]">
            {sortedGoals.map((g) => {
              const revenue = goalRevenue(g);
              const pct =
                Number(g.monthly_target) > 0
                  ? Math.min(100, (revenue / Number(g.monthly_target)) * 100)
                  : 0;
              const heightPct = Math.max(28, (Number(g.monthly_target) / maxTarget) * 100);
              const isActive = g.status === "Ativa";
              const isFuture = g.status === "Futura";
              const isDone = g.status === "Concluída";

              return (
                <div key={g.id} className="flex flex-col justify-end h-full">
                  <Card
                    className={cn(
                      "border-2 transition-all flex flex-col justify-between",
                      isActive && "border-amber-400 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/40",
                      isFuture && "border-border bg-[#0B1E3D]/95 text-white opacity-80",
                      isDone && "border-emerald-400 bg-emerald-500/10"
                    )}
                    style={{ height: `${heightPct}%`, minHeight: "150px" }}
                  >
                    <CardContent className="p-3 md:p-4 flex flex-col h-full gap-2">
                      <div className="flex items-center justify-between">
                        <div className={cn(
                          "text-xl md:text-2xl font-extrabold tracking-tight",
                          isFuture && "text-white"
                        )}>
                          {g.month_label}
                        </div>
                        <Badge className={cn("text-[9px] px-1.5", STATUS_BADGE[g.status])}>
                          {g.status}
                        </Badge>
                      </div>
                      <div>
                        <div className={cn(
                          "text-[10px] uppercase tracking-widest font-bold",
                          isFuture ? "text-white/50" : "text-muted-foreground"
                        )}>
                          Meta mensal
                        </div>
                        <div className={cn(
                          "text-base md:text-lg font-bold",
                          isActive && "text-amber-600",
                          isDone && "text-emerald-700"
                        )}>
                          {formatBRLShort(g.monthly_target)}
                        </div>
                        <div className={cn(
                          "text-[10px]",
                          isFuture ? "text-white/50" : "text-muted-foreground"
                        )}>
                          {formatBRLShort(g.weekly_target)}/sem
                        </div>
                      </div>

                      <div className="mt-auto space-y-1.5">
                        {(isActive || isDone) && (
                          <>
                            <div className={cn(
                              "text-[10px] font-semibold",
                              isFuture ? "text-white/70" : "text-foreground"
                            )}>
                              {formatBRLShort(revenue)} ({pct.toFixed(0)}%)
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </>
                        )}
                        {isActive && (
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[9px] border-0 w-fit">
                            <Calendar className="h-2.5 w-2.5 mr-1" /> Mês atual
                          </Badge>
                        )}
                        {isDone && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[9px] border-0 w-fit gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Concluído
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Card grande do mês ativo */}
      {activeGoal && (
        <ActiveMonthCard goal={activeGoal} quotes={quotes} />
      )}

      {/* Tabela detalhada */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Detalhamento da escada</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <Th>Mês</Th>
                <Th>Meta mensal</Th>
                <Th>Meta semanal</Th>
                <Th>Ticket R$2.500</Th>
                <Th>Ticket R$3.000</Th>
                <Th>Objetivo do mês</Th>
              </tr>
            </thead>
            <tbody>
              {sortedGoals.map((g) => {
                const revenue = goalRevenue(g);
                const pct =
                  Number(g.monthly_target) > 0
                    ? (revenue / Number(g.monthly_target)) * 100
                    : 0;
                const isActive = g.status === "Ativa";
                const isDone = g.status === "Concluída";
                return (
                  <tr
                    key={g.id}
                    className={cn(
                      "border-b border-border/50",
                      isActive && "bg-amber-50 dark:bg-amber-500/10 font-medium"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">{g.month_label}</span>
                        {isActive && (
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[9px] border-0">
                            Atual
                          </Badge>
                        )}
                        {isDone && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[9px] border-0">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{formatBRL(g.monthly_target)}</div>
                      {(isActive || isDone) && (
                        <div className="text-xs text-muted-foreground">
                          {formatBRLShort(revenue)} atingido ({pct.toFixed(0)}%)
                        </div>
                      )}
                      {g.month === "2026-10" && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                          R$ 220k gestão / R$ 200k oficial
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatBRL(g.weekly_target)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        <strong>{g.ticket_2500_sales}</strong>{" "}
                        <span className="text-muted-foreground text-xs">vendas/mês</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        <strong>{g.ticket_3000_sales}</strong>{" "}
                        <span className="text-muted-foreground text-xs">vendas/mês</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-md text-sm text-muted-foreground">
                      {g.objective}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Gatilhos de avanço */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-primary" /> Gatilhos de Avanço
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Condições para avançar para o próximo degrau
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Fechamento</Th>
                  <Th>Se bater</Th>
                  <Th>Próximo passo</Th>
                </tr>
              </thead>
              <tbody>
                {sortedGoals.map((g) => {
                  const revenue = goalRevenue(g);
                  const reached = revenue >= Number(g.monthly_target || 0) && Number(g.monthly_target) > 0;
                  return (
                    <tr key={g.id} className="border-b border-border/50">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {reached ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground/60" />
                          )}
                          {g.month_label}
                        </div>
                      </td>
                      <td className="px-4 py-3">{g.advance_condition}</td>
                      <td className="px-4 py-3 text-muted-foreground">{g.advance_next_step}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Separator />

          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-amber-500" /> Cenários stretch
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {STRETCH_TRIGGERS.map((s) => (
                <Card key={s.label} className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-500/10 dark:to-amber-500/5">
                  <CardContent className="p-4 space-y-2">
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-0 w-fit">
                      {s.label}
                    </Badge>
                    <div className="text-sm font-medium">{s.condition}</div>
                    <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{s.next}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog editar */}
      <EditGoalsDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        goals={sortedGoals}
        onChange={() => { reload(); }}
        toast={toast}
      />
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-3">
      {children}
    </th>
  );
}

// ─── Card grande do mês ativo ───────────────────────────────────────
function ActiveMonthCard({ goal, quotes }) {
  const target = Number(goal.monthly_target) || 0;
  const monthQuotes = useMemo(
    () =>
      quotes.filter(
        (q) =>
          (q.status === "Aprovado" || q.status === "Emitido") &&
          monthMatches(q.created_date, goal.month)
      ),
    [quotes, goal.month]
  );
  const revenue = monthQuotes.reduce((s, q) => s + (q.total_value || 0), 0);
  const pct = target > 0 ? Math.min(100, (revenue / target) * 100) : 0;
  const missing = Math.max(0, target - revenue);

  const { start, end } = getMonthBounds(goal.month);
  const totalDays = getDaysInMonth(goal.month);
  const today = new Date();
  const monthStarted = today >= start;
  const monthEnded = today > end;
  const elapsedDays = monthEnded
    ? totalDays
    : monthStarted
    ? Math.max(1, today.getDate())
    : 0;
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const dailyAvg = elapsedDays > 0 ? revenue / elapsedDays : 0;
  const dailyNeeded = remainingDays > 0 ? missing / remainingDays : 0;
  const onPace = dailyAvg >= dailyNeeded || pct >= 100;

  // Breakdown semanal
  const weeks = useMemo(() => {
    const result = [
      { idx: 1, range: "1-7", revenue: 0 },
      { idx: 2, range: "8-14", revenue: 0 },
      { idx: 3, range: "15-21", revenue: 0 },
      { idx: 4, range: `22-${totalDays}`, revenue: 0 },
    ];
    monthQuotes.forEach((q) => {
      const d = new Date(q.created_date).getDate();
      const widx = d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3;
      result[widx].revenue += q.total_value || 0;
    });
    return result;
  }, [monthQuotes, totalDays]);

  const currentWeekIdx = Math.min(3, Math.floor((today.getDate() - 1) / 7));

  return (
    <Card className="border-0 overflow-hidden">
      <CardContent
        className="p-6 md:p-8 text-white"
        style={{
          background: "linear-gradient(135deg, #0B1E3D 0%, #14285A 100%)",
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Esquerda: progresso */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">
              <Calendar className="h-3 w-3" /> Mês ativo
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {goal.month_label}
              </h2>
              <span className="text-white/50 text-sm">{goal.month}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl md:text-3xl font-extrabold">
                  {formatBRL(revenue)}
                </span>
                <span className="text-sm text-white/60">de {formatBRL(target)}</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    pct >= 100 ? "bg-emerald-400" : "bg-amber-400"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">{pct.toFixed(0)}% atingido</span>
                <span className="text-white/60">
                  {monthEnded
                    ? "mês encerrado"
                    : `${remainingDays} dias restantes`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-white/10">
              <Stat label="Faltam" value={formatBRL(missing)} />
              <Stat
                label="Média diária atual"
                value={formatBRL(dailyAvg)}
              />
              <Stat
                label="Necessário/dia"
                value={remainingDays > 0 ? formatBRL(dailyNeeded) : "—"}
              />
            </div>

            <div
              className={cn(
                "p-3 rounded-lg text-sm flex items-center gap-2 border",
                onPace
                  ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                  : "bg-amber-500/15 border-amber-400/40 text-amber-200"
              )}
            >
              {onPace ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>No ritmo ✅</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span>Abaixo do ritmo ⚠️ — precisa acelerar</span>
                </>
              )}
            </div>
          </div>

          {/* Direita: breakdown semanal */}
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400 mb-3">
              Breakdown semanal
            </div>
            <div className="space-y-2">
              {weeks.map((w, i) => {
                const wpct =
                  Number(goal.weekly_target) > 0
                    ? Math.min(100, (w.revenue / Number(goal.weekly_target)) * 100)
                    : 0;
                const isCurrent = monthStarted && !monthEnded && i === currentWeekIdx;
                const isFutureWeek = monthStarted && !monthEnded && i > currentWeekIdx;
                return (
                  <div
                    key={w.idx}
                    className={cn(
                      "p-2.5 rounded-lg border",
                      isCurrent
                        ? "bg-amber-500/15 border-amber-400/40"
                        : "bg-white/5 border-white/10",
                      isFutureWeek && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold">
                        Semana {w.idx} <span className="text-white/40">({w.range})</span>
                      </span>
                      {isCurrent && (
                        <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[9px] border-0">
                          em andamento
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold">{formatBRLShort(w.revenue)}</span>
                      <span className="text-white/60 text-xs">
                        {wpct.toFixed(0)}% sem
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-0.5">
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

// ─── Dialog de edição ────────────────────────────────────────────────
function EditGoalsDialog({ open, onClose, goals, onChange, toast }) {
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    if (open) {
      setDrafts(goals.map((g) => ({ ...g })));
    }
  }, [open, goals]);

  const updateField = (idx, field, value) => {
    setDrafts((p) => {
      const next = [...p];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addMonth = () => {
    const last = drafts[drafts.length - 1];
    const newMonth = last
      ? incrementMonth(last.month)
      : new Date().toISOString().slice(0, 7);
    setDrafts((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        month: newMonth,
        month_label: monthLabelFromYM(newMonth),
        monthly_target: 0,
        weekly_target: 0,
        ticket_2500_sales: 0,
        ticket_3000_sales: 0,
        objective: "",
        advance_condition: "",
        advance_next_step: "",
        status: "Futura",
        actual_revenue: 0,
        created_date: new Date().toISOString(),
      },
    ]);
  };

  const removeRow = (idx) => {
    setDrafts((p) => p.filter((_, i) => i !== idx));
  };

  const completeMonth = (idx) => {
    setDrafts((p) => {
      const next = [...p];
      next[idx] = { ...next[idx], status: "Concluída" };
      // Ativa o próximo
      if (next[idx + 1] && next[idx + 1].status === "Futura") {
        next[idx + 1] = { ...next[idx + 1], status: "Ativa" };
      }
      return next;
    });
  };

  const handleSaveAll = () => {
    // Persiste: atualiza existentes, cria novos, deleta removidos
    const existing = localClient.entities.CommercialGoals.list();
    const existingIds = new Set(existing.map((g) => g.id));
    const draftIds = new Set(drafts.map((g) => g.id));

    // Deleta removidos
    existing.forEach((g) => {
      if (!draftIds.has(g.id)) {
        localClient.entities.CommercialGoals.delete(g.id);
      }
    });
    // Atualiza/cria
    drafts.forEach((d) => {
      const payload = {
        ...d,
        monthly_target: Number(d.monthly_target) || 0,
        weekly_target: Number(d.weekly_target) || 0,
        ticket_2500_sales: Number(d.ticket_2500_sales) || 0,
        ticket_3000_sales: Number(d.ticket_3000_sales) || 0,
      };
      if (existingIds.has(d.id)) {
        localClient.entities.CommercialGoals.update(d.id, payload);
      } else {
        localClient.entities.CommercialGoals.create(payload);
      }
    });

    toast({ title: "Escada atualizada" });
    onChange();
    onClose();
  };

  const handleReset = () => {
    if (!confirm("Resetar todas as metas? Isso apaga as metas atuais e re-aplica o seed.")) return;
    localStorage.removeItem("pcd_commercial_goals");
    seedCommercialGoals();
    toast({ title: "Metas resetadas para o padrão" });
    onChange();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar escada de metas</DialogTitle>
          <DialogDescription>
            Ajuste valores, adicione meses ou conclua o mês atual para ativar o próximo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {drafts.map((d, idx) => (
            <Card key={d.id} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-32 h-8"
                      placeholder="2026-06"
                      value={d.month}
                      onChange={(e) => updateField(idx, "month", e.target.value)}
                    />
                    <Input
                      className="w-32 h-8"
                      placeholder="Junho"
                      value={d.month_label}
                      onChange={(e) => updateField(idx, "month_label", e.target.value)}
                    />
                    <Badge className={STATUS_BADGE[d.status]}>{d.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {d.status === "Ativa" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeMonth(idx)}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Concluir mês
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow(idx)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FormField label="Meta mensal (R$)">
                    <Input
                      type="number"
                      value={d.monthly_target}
                      onChange={(e) => updateField(idx, "monthly_target", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Meta semanal (R$)">
                    <Input
                      type="number"
                      value={d.weekly_target}
                      onChange={(e) => updateField(idx, "weekly_target", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Vendas ticket R$2.500">
                    <Input
                      type="number"
                      value={d.ticket_2500_sales}
                      onChange={(e) => updateField(idx, "ticket_2500_sales", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Vendas ticket R$3.000">
                    <Input
                      type="number"
                      value={d.ticket_3000_sales}
                      onChange={(e) => updateField(idx, "ticket_3000_sales", e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField label="Objetivo do mês">
                  <Textarea
                    rows={2}
                    value={d.objective}
                    onChange={(e) => updateField(idx, "objective", e.target.value)}
                  />
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Condição de avanço">
                    <Input
                      value={d.advance_condition}
                      onChange={(e) => updateField(idx, "advance_condition", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Próximo passo">
                    <Input
                      value={d.advance_next_step}
                      onChange={(e) => updateField(idx, "advance_next_step", e.target.value)}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={addMonth} variant="outline" className="w-full gap-2">
            <Plus className="h-4 w-4" /> Adicionar mês
          </Button>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleReset} variant="outline" className="text-red-600 gap-2">
            <RotateCcw className="h-4 w-4" /> Resetar metas
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSaveAll}>Salvar tudo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-widest font-semibold">
        {label}
      </Label>
      {children}
    </div>
  );
}

function incrementMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFromYM(ym) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long" }).replace(/^./, (c) => c.toUpperCase());
}
