import { Activity } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/shared/lib/format";
import { timeAgo } from "@/features/dashboard/lib/dashboardUtils";

export function AtividadeRecente({ recentActivity }) {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-text-muted" />
        Atividade Recente
      </h3>

      {recentActivity.length === 0 ? (
        <p className="text-center text-text-muted py-6 text-sm">
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <div className="space-y-1">
          {recentActivity.map((ev, idx) => {
            const trecho = ev.quote.itinerary?.trechos?.[0];
            const seg = trecho?.segmentos?.[0];
            const origem = seg?.origem_iata || trecho?.origem_iata || "";
            const destino = seg?.destino_iata || trecho?.destino_iata || "";
            const rota = origem && destino ? `${origem} → ${destino}` : "";
            const EvIcon = ev.icon;

            return (
              <div
                key={idx}
                className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0"
              >
                <EvIcon className={cn("w-4 h-4 shrink-0", ev.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-secondary">
                    <span className={cn("font-medium", ev.color)}>
                      {ev.quote.seller_name || "—"}
                    </span>{" "}
                    {ev.label}{" "}
                    <span className="font-mono text-xs text-text-muted">
                      {ev.quote.quote_number}
                    </span>
                    {rota && (
                      <span className="text-text-muted"> · {rota}</span>
                    )}
                  </p>
                  <p className="text-xs text-text-muted tabular-nums">
                    {formatBRL(ev.quote.total_value)}
                  </p>
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
                  {timeAgo(ev.date)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
