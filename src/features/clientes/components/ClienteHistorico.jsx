import { CheckCircle2, FileStack } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { formatBRL } from "@/shared/lib/format";
import { QuoteRow } from "./ClienteQuoteRow";

export function ClienteHistorico({ sold, others, totalSpent, onView }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Histórico Completo
      </h2>

      {/* Compras realizadas */}
      <Card className="border-success/30 bg-success/10 dark:bg-success/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-success dark:text-success">
            <CheckCircle2 className="h-4 w-4" /> Compras Realizadas ·{" "}
            <span className="font-normal">
              {sold.length} {sold.length === 1 ? "compra" : "compras"} · Total: {formatBRL(totalSpent)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sold.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Este cliente ainda não fechou nenhuma compra.
            </div>
          ) : (
            sold.map((q) => <QuoteRow key={q.id} quote={q} onView={() => onView(q)} />)
          )}
        </CardContent>
      </Card>

      {/* Outras */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileStack className="h-4 w-4 text-muted-foreground" />
            Cotações Pendentes / Outros Status ·{" "}
            <span className="font-normal text-muted-foreground">
              {others.length} {others.length === 1 ? "cotação" : "cotações"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {others.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Sem cotações em outros status.
            </div>
          ) : (
            others.map((q) => <QuoteRow key={q.id} quote={q} onView={() => onView(q)} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
