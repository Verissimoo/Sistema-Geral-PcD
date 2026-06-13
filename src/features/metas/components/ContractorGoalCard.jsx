import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Trophy,
  Target,
  TrendingUp,
  Award,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { calcMonthlyEstimated } from "@/features/metas/goalsConfig";
import { fmt } from "@/features/metas/lib/goalsFormat";

// ──────────────────────────────────────────────────────────────────────────────
// Card de situação do consultor
// ──────────────────────────────────────────────────────────────────────────────
export default function ContractorGoalCard({ contractor, totalPoints, config }) {
  const scopeType = contractor.scope_type || "TI/Automações";
  const scopeCfg = config[scopeType] || config["TI/Automações"];
  const goal = scopeCfg.monthly_point_goal;
  const calc = calcMonthlyEstimated(totalPoints, config, scopeType);
  const pct = goal > 0 ? Math.min((totalPoints / goal) * 100, 100) : 0;

  let statusLabel, statusColor, statusBg, StatusIcon;
  if (totalPoints < goal) {
    statusLabel = "Abaixo da meta";
    statusColor = "text-danger";
    statusBg = "bg-danger/10";
    StatusIcon = AlertCircle;
  } else if (totalPoints === goal) {
    statusLabel = "Meta atingida";
    statusColor = "text-accent";
    statusBg = "bg-accent/10";
    StatusIcon = CheckCircle;
  } else {
    statusLabel = `Meta superada (+${calc.excedente} pts)`;
    statusColor = "text-success";
    statusBg = "bg-success/10";
    StatusIcon = Trophy;
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-lg">{contractor.name}</h3>
          <p className="text-sm text-muted-foreground">{scopeType}</p>
        </div>
        <Badge className={`${statusBg} ${statusColor} border-0 px-3 py-1 flex items-center gap-1`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Target className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="font-bold">{goal} pts</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <TrendingUp className="h-5 w-5 text-secondary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Pontuação</p>
            <p className="font-bold">{totalPoints} pts</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Award className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Excedente</p>
            <p className="font-bold">{calc.excedente > 0 ? `+${calc.excedente} pts` : "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Trophy className="h-5 w-5 text-success shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Estimado</p>
            <p className={`font-bold text-sm ${statusColor}`}>{fmt(calc.total)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-muted/30 border px-4 py-3 text-xs space-y-1 mb-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Salário base</span>
          <span className="font-medium">{fmt(calc.salarioBase)}</span>
        </div>
        {calc.bonusExtra > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Bônus excedente ({calc.excedente} pts × {fmt(scopeCfg.bonus_per_extra_point)})
            </span>
            <span className="font-medium text-success">+{fmt(calc.bonusExtra)}</span>
          </div>
        )}
        {calc.bonusEspecial > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bônus especiais ativos</span>
            <span className="font-medium text-warning">+{fmt(calc.bonusEspecial)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t font-semibold">
          <span>Total estimado</span>
          <span className={statusColor}>{fmt(calc.total)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{totalPoints} de {goal} pts</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              totalPoints >= goal ? "bg-success" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
