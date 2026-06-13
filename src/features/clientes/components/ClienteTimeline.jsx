import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { formatDateTimeBR } from "@/shared/lib/format";
import { timeAgo } from "./clienteDetalheUtils";

export function ClienteTimeline({ timeline }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Linha do tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            Nenhuma atividade registrada para este cliente.
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
            <div className="space-y-3">
              {timeline.map((ev, i) => {
                const Icon = ev.icon;
                return (
                  <div key={i} className="relative">
                    <div
                      className={cn(
                        "absolute -left-[20px] top-1 h-7 w-7 rounded-full flex items-center justify-center border-4 border-card",
                        ev.bg
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", ev.color)} />
                    </div>
                    <div className="ml-2 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="text-sm font-medium">{ev.text}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{ev.sub}</div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTimeBR(ev.date)} · {timeAgo(ev.date)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
