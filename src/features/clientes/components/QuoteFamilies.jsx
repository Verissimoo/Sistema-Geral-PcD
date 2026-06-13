import { GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { formatBRL, formatDateBR } from "@/shared/lib/format";
import { STATUS_STYLES } from "./clienteDetalheUtils";

export function QuoteFamilies({ families, onView }) {
  if (families.length === 0) return null;
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Famílias de Cotações
      </h2>
      {families.map((family) => (
        <Card key={family.headId} className="border-l-4 border-l-amber-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-warning" />
              Histórico — {family.items.length} cotações
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Primeira em {formatDateBR(family.head.created_date)}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {family.items.map((q, i) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-2 rounded hover:bg-bg-elevated cursor-pointer transition-colors"
                onClick={() => onView(q)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-warning/10 text-warning text-xs font-bold flex items-center justify-center">
                    #{i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{q.quote_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDateBR(q.created_date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatBRL(q.total_value)}</p>
                  <Badge className={cn("text-[10px] border mt-1", STATUS_STYLES[q.status])}>
                    {q.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
