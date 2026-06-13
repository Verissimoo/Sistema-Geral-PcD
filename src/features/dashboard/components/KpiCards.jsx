import {
  FileText, CheckCircle2, TrendingUp, DollarSign, Users,
} from "lucide-react";
import { formatBRL } from "@/shared/lib/format";
import { MetricCard } from "@/features/dashboard/components/MetricCard";

export function KpiCards({
  periodQuotes,
  periodDates,
  totalEmitidos,
  totalRevenue,
  pipelineQuotes,
  pipelineValue,
  activeSellers,
  emFormacao,
}) {
  return (
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
  );
}
