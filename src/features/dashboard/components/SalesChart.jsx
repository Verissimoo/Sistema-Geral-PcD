import { BarChart3 } from "lucide-react";
import { Card } from "@/shared/ui/card";

export function SalesChart({
  periodDates,
  chartData,
  maxValue,
  totalCotacoes,
  totalVendas,
  conversao,
}) {
  return (
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
  );
}
