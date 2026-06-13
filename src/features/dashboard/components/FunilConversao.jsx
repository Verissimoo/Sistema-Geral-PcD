import { Filter } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";

export function FunilConversao({ funil, periodQuotes }) {
  return (
    <Card className="lg:col-span-2 p-6">
      <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Filter className="w-4 h-4 text-text-muted" />
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
                <span className="text-sm font-medium text-text-secondary">{stage.label}</span>
                <span className="text-sm text-text-primary">
                  <strong className="tabular-nums">{stage.count}</strong>
                  <span className="text-xs text-text-muted ml-1 tabular-nums">
                    ({pct.toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
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
  );
}
