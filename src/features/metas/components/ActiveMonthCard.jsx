import { useMemo } from "react";
import { Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/shared/lib/format";
import {
  formatBRLShort, monthMatches, getIssuedDate,
  getDaysInMonth, getMonthBounds,
} from "@/features/metas/lib/metasUtils";

// ─── Card grande do mês ativo ───────────────────────────────────────
// `quotes` aqui já vem pré-filtrado: somente role vendedor/gerente E
// status "Emitido" (revenueQuotes em GerenteMetasComerciais).
export default function ActiveMonthCard({ goal, quotes, isCurrentMonth = true }) {
  const target = Number(goal.monthly_target) || 0;
  const monthQuotes = useMemo(
    () => quotes.filter((q) => monthMatches(getIssuedDate(q), goal.month)),
    [quotes, goal.month]
  );
  const revenue = monthQuotes.reduce((s, q) => s + (Number(q.total_value) || 0), 0);
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

  // Breakdown semanal — usa a mesma data canônica de emissão.
  const weeks = useMemo(() => {
    const result = [
      { idx: 1, range: "1-7", revenue: 0 },
      { idx: 2, range: "8-14", revenue: 0 },
      { idx: 3, range: "15-21", revenue: 0 },
      { idx: 4, range: `22-${totalDays}`, revenue: 0 },
    ];
    monthQuotes.forEach((q) => {
      const issued = getIssuedDate(q);
      if (!issued) return;
      const d = new Date(issued).getDate();
      const widx = d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3;
      result[widx].revenue += Number(q.total_value) || 0;
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
            <div className="flex items-center gap-2 text-warning text-xs font-bold uppercase tracking-[0.3em]">
              <Calendar className="h-3 w-3" /> {isCurrentMonth ? "Mês atual" : "Mês ativo"}
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
              <div className="h-3 rounded-full bg-bg-surface overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    pct >= 100 ? "bg-success" : "bg-warning"
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
                  ? "bg-success/15 border-success/30 text-success"
                  : "bg-warning/15 border-warning/30 text-warning"
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
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-warning mb-3">
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
                        ? "bg-warning/15 border-warning/30"
                        : "bg-white/10 border-white/10",
                      isFutureWeek && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold">
                        Semana {w.idx} <span className="text-white/40">({w.range})</span>
                      </span>
                      {isCurrent && (
                        <Badge className="bg-warning hover:bg-warning text-white text-[9px] border-0">
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
