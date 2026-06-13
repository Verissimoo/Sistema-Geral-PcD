import { Eye } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { formatBRL, formatDateBR } from "@/shared/lib/format";
import { STATUS_STYLES, timeAgo } from "./clienteDetalheUtils";

export function QuoteRow({ quote, onView }) {
  const ida =
    quote.itinerary?.trechos?.find((t) => t.tipo === "ida") ||
    quote.itinerary?.trechos?.[0];
  const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
  const companhia = ida?.companhia || "—";

  return (
    <div className="p-3 rounded-lg border border-border bg-card flex items-center gap-3 flex-wrap hover:border-primary/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold">{quote.quote_number || "—"}</span>
          <span className="text-sm font-semibold">{route}</span>
          <Badge variant="secondary" className="text-[10px]">{companhia}</Badge>
          <Badge variant="outline" className="text-[10px]">{quote.ticket_type || "Normal"}</Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {quote.seller_name || "—"} · {formatDateBR(quote.created_date)} · {timeAgo(quote.created_date)}
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-sm">{formatBRL(quote.total_value)}</div>
        <Badge className={cn("text-[10px] border mt-1", STATUS_STYLES[quote.status])}>
          {quote.status}
        </Badge>
      </div>
      <Button size="sm" variant="ghost" onClick={onView} className="gap-1.5">
        <Eye className="h-3.5 w-3.5" /> Detalhes
      </Button>
    </div>
  );
}
