import { Target, ArrowRight } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/shared/lib/format";

export function MetaCard({ metaAtual, receitaMes, navigate }) {
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
