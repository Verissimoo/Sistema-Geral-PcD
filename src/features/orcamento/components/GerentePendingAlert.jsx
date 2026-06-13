import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { formatBRL } from "@/shared/lib/format";
import { gerenteTimeAgo } from "@/features/orcamento/lib/gerenteTimeAgo";

export function GerentePendingAlert({ pendingOver48h }) {
  if (pendingOver48h.length === 0) return null;
  return (
    <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-warning dark:text-warning">
          <AlertTriangle className="h-4 w-4" />
          Orçamentos Pendentes que Requerem Atenção
          <Badge className="bg-warning hover:bg-warning text-white border-0">
            {pendingOver48h.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pendingOver48h.slice(0, 5).map((q) => {
          const ida =
            q.itinerary?.trechos?.find((t) => t.tipo === "ida") ||
            q.itinerary?.trechos?.[0];
          const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
          return (
            <div
              key={q.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border flex-wrap"
            >
              <span className="font-mono text-xs font-bold">{q.quote_number}</span>
              <span className="text-sm font-medium">{q.client?.name}</span>
              <span className="text-xs text-muted-foreground">{route}</span>
              <span className="font-bold text-sm ml-auto">{formatBRL(q.total_value)}</span>
              <Badge variant="outline" className="gap-1 border-warning/30 text-warning">
                <Clock className="h-3 w-3" /> Enviado {gerenteTimeAgo(q.created_date)}
              </Badge>
              <Button size="sm" variant="outline" disabled className="gap-1.5 text-xs">
                Cobrar follow-up
              </Button>
            </div>
          );
        })}
        {pendingOver48h.length > 5 && (
          <div className="text-xs text-muted-foreground text-center pt-1">
            + {pendingOver48h.length - 5} outros pendentes
          </div>
        )}
      </CardContent>
    </Card>
  );
}
