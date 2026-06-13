import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import { Separator } from "@/shared/ui/separator";
import {
  Trophy, Target, DollarSign, ChevronRight, Award, Clock, Sparkles,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { CAREER_LEVELS, getBonusTier, getBonusValue } from "@/features/carreira/careerPlan";
import { formatBRL } from "@/shared/lib/format";
import { Line, CheckLine, fmtMonth } from "./careerShared";

export function BonusTiers({ level, tier, bonusValue }) {
  const tiers = [
    { key: "100%", label: "Atingir meta", value: level.bonus100, color: "emerald" },
    { key: "150%", label: "1,5× a meta", value: level.bonus150, color: "amber" },
    { key: "200%", label: "2× a meta", value: level.bonus200, color: "yellow" },
  ];
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-warning" /> Bônus por desempenho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {tiers.map((t) => {
            const reached = tier && parseInt(tier) >= parseInt(t.key);
            return (
              <div
                key={t.key}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  reached
                    ? t.color === "emerald" && "border-success/30 bg-success/10 dark:bg-success/10 shadow-md"
                    : "border-border bg-muted/30",
                  reached && t.color === "amber" && "border-warning/30 bg-warning/10 dark:bg-warning/10 shadow-md",
                  reached && t.color === "yellow" && "border-warning/30 bg-warning/10 dark:bg-warning/10 shadow-md"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold",
                      reached && "border-current"
                    )}
                  >
                    {t.key}
                  </Badge>
                  {reached && <Sparkles className={cn("h-3.5 w-3.5", t.color === "emerald" && "text-success", t.color === "amber" && "text-warning", t.color === "yellow" && "text-warning")} />}
                </div>
                <div className="text-xs text-muted-foreground">{t.label}</div>
                <div className="text-lg font-bold mt-1">+ {formatBRL(t.value)}</div>
              </div>
            );
          })}
        </div>
        <div
          className={cn(
            "p-3 rounded-lg text-sm flex items-center gap-2 border",
            tier
              ? "bg-success/10 border-success/30 text-success dark:text-success"
              : "bg-muted/40 border-border text-muted-foreground"
          )}
        >
          {tier ? (
            <>
              <Trophy className="h-4 w-4 text-success" />
              <span>
                Seu bônus este mês: <strong>{formatBRL(bonusValue)}</strong> ({tier} da meta)
              </span>
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              <span>Meta não atingida ainda — continue avançando!</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RemunerationCard({ level, bonusValue }) {
  const total = (level.fixedSalary || 0) + (bonusValue || 0);
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-success" /> Remuneração estimada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Line label="Fixo mensal" value={formatBRL(level.fixedSalary)} />
        <Line label="Bônus do mês" value={formatBRL(bonusValue)} />
        <Line
          label="Comissões de vendas"
          value="(calculado pelo sistema de comissões)"
          muted
        />
        <Separator className="my-2" />
        <Line label="Estimativa total fixo + bônus" value={formatBRL(total)} bold />
      </CardContent>
    </Card>
  );
}

export function NextLevelCard({ currentLevel, nextLevel, monthlyRevenue }) {
  const goalReached = nextLevel.monthlyGoal && monthlyRevenue >= nextLevel.monthlyGoal;
  const minTimeOk = false; // Sem registro temporal automático ainda — sempre marcado como pendente
  const overall = (goalReached ? 50 : 25) + (minTimeOk ? 50 : 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" /> Caminho para {nextLevel.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <CheckLine
            done={minTimeOk}
            text={`Tempo mínimo no nível atual: ${currentLevel.minTime}`}
          />
          <CheckLine
            done={!!goalReached}
            text={`Meta mensal consistente: ${formatBRL(nextLevel.monthlyGoal)}`}
          />
        </div>
        <div className="space-y-1">
          <Progress value={overall} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {overall}% do caminho para <strong>{nextLevel.title}</strong>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BifurcationCard() {
  const n6a = CAREER_LEVELS.find((l) => l.level === "N6A");
  const n6b = CAREER_LEVELS.find((l) => l.level === "N6B");
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" /> Próximo passo: dois caminhos possíveis
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[n6a, n6b].map((lv) => (
          <div key={lv.level} className="p-4 rounded-lg border border-border bg-card">
            <Badge
              className="mb-2 text-white"
              style={{ background: lv.color }}
            >
              {lv.level}
            </Badge>
            <div className="font-bold">{lv.title}</div>
            <p className="text-sm text-muted-foreground mt-1">{lv.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function HistoryCards({ history, level }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Histórico (últimos 3 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {history.map((h) => {
            const pct = level.monthlyGoal
              ? (h.revenue / level.monthlyGoal) * 100
              : 0;
            const tier = getBonusTier(h.revenue, level.monthlyGoal);
            const bonus = getBonusValue(level, tier);
            const reached = !!tier;
            return (
              <Card key={`${h.year}-${h.monthIdx}`} className="border-border/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{fmtMonth(h.label)}</div>
                    <Badge
                      className={cn(
                        "border",
                        reached
                          ? "bg-success/10 text-success border-success/30 hover:bg-success/10"
                          : "bg-danger/10 text-danger border-danger/30 hover:bg-danger/10"
                      )}
                    >
                      {reached ? "Atingiu" : "Não atingiu"}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold">{formatBRL(h.revenue)}</div>
                  <Progress value={Math.min(100, pct)} className="h-1.5" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pct.toFixed(0)}% da meta</span>
                    <span>Bônus: {formatBRL(bonus)}</span>
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
