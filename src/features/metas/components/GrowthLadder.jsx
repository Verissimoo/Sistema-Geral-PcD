import { TrendingUp, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { cn } from "@/shared/lib/utils";
import { formatBRLShort } from "@/features/metas/lib/metasUtils";

export default function GrowthLadder({ sortedGoals, goalRevenue, getGoalVisualState, maxTarget }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-warning" /> Escada visual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 overflow-x-auto pb-2">
          {sortedGoals.map((g) => {
            const revenue = goalRevenue(g);
            const pct =
              Number(g.monthly_target) > 0
                ? Math.min(100, (revenue / Number(g.monthly_target)) * 100)
                : 0;
            const state = getGoalVisualState(g);
            const isCurrent = state === "current";
            const isPast = state === "past";
            const isFuture = state === "future";

            // Altura proporcional à meta mensal (degrau crescente)
            const ratio = (Number(g.monthly_target) || 0) / maxTarget;
            const minH = 180;
            const maxH = 320;
            const height = minH + (maxH - minH) * ratio;

            return (
              <Card
                key={g.id}
                className={cn(
                  "shrink-0 w-[200px] border-2 transition-all flex flex-col justify-between",
                  isCurrent && "border-warning/30 bg-bg-surface shadow-xl ring-2 ring-warning/40",
                  isPast && "border-success/30 bg-success/10",
                  isFuture && "border-border bg-[#0B1E3D]/95 text-white opacity-90"
                )}
                style={{ height: `${height}px` }}
              >
                <CardContent className="p-3 md:p-4 flex flex-col h-full gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn(
                      "text-xl md:text-2xl font-extrabold tracking-tight",
                      isFuture && "text-white"
                    )}>
                      {g.month_label}
                    </div>
                    {isCurrent && (
                      <Badge className="bg-warning hover:bg-warning text-white text-[9px] border-0">
                        Mês Atual
                      </Badge>
                    )}
                    {isPast && (
                      <Badge className="bg-success hover:bg-success text-white text-[9px] border-0 gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Concluído
                      </Badge>
                    )}
                    {isFuture && (
                      <Badge className="bg-text-muted hover:bg-text-muted text-white text-[9px] border-0">
                        Futura
                      </Badge>
                    )}
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
                      isCurrent && "text-warning",
                      isPast && "text-success"
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
                    {(isCurrent || isPast) && (
                      <>
                        <div className="text-[10px] font-semibold text-foreground">
                          {formatBRLShort(revenue)} ({pct.toFixed(0)}%)
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
