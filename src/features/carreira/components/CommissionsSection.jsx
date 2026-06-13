import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Wallet, Plane } from "lucide-react";
import { computeCommission } from "@/shared/lib/pricingCalculator";
import { formatBRL } from "@/shared/lib/format";

export function CommissionsSection({ seller, quotes, currentLevel }) {
  const { vendidosMes, totalComissoes, fixoMensal, totalAReceber } = useMemo(() => {
    const myQuotes = quotes.filter((q) => q.seller_id === seller.id);
    const vendidos = myQuotes.filter(
      (q) => q.status === "Aprovado" || q.status === "Emitido"
    );
    const now = new Date();
    const doMes = vendidos.filter((q) => {
      const d = new Date(q.created_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    // Recalcula sempre via helper para corrigir quotes legados que tinham
    // commission.total gravado sem a multiplicação por passageiros.
    const doMesComComissao = doMes.map((q) => ({
      ...q,
      comissaoCalculada: computeCommission(q).total,
    }));
    const total = doMesComComissao.reduce((s, q) => s + q.comissaoCalculada, 0);
    const fixo = currentLevel.fixedSalary || 0;
    return {
      vendidosMes: doMesComComissao,
      totalComissoes: total,
      fixoMensal: fixo,
      totalAReceber: fixo + total,
    };
  }, [seller.id, quotes, currentLevel]);

  return (
    <div className="space-y-4">
      <Card className="bg-bg-elevated text-text-primary border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-1">
                Fixo mensal
              </p>
              <p className="text-2xl font-bold">{formatBRL(fixoMensal)}</p>
              <p className="text-text-muted text-xs">Nível {currentLevel.level}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-1">
                Comissões do mês
              </p>
              <p className="text-2xl font-bold text-warning">
                {formatBRL(totalComissoes)}
              </p>
              <p className="text-text-muted text-xs">{vendidosMes.length} vendas</p>
            </div>
            <div className="md:border-l border-border-strong md:pl-6">
              <p className="text-text-muted text-xs uppercase tracking-wider mb-1">
                Total a receber
              </p>
              <p className="text-3xl font-semibold text-success">
                {formatBRL(totalAReceber)}
              </p>
              <p className="text-text-muted text-xs">Fixo + comissões</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-success" /> Comissões por venda
            </span>
            <Badge variant="outline">
              {vendidosMes.length} venda{vendidosMes.length === 1 ? "" : "s"} este mês
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendidosMes.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nenhuma venda registrada este mês ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {vendidosMes.map((q) => {
                const trechoIda =
                  q.itinerary?.trechos?.find((t) => t.tipo === "ida") ||
                  q.itinerary?.trechos?.[0];
                const dataVoo = q.dates?.departure
                  ? new Date(q.dates.departure + "T12:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";
                const rota = trechoIda
                  ? `${trechoIda.origem_iata} → ${trechoIda.destino_iata}`
                  : q.client?.name || "—";
                return (
                  <div
                    key={q.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 flex-1 min-w-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {q.quote_number || q.id?.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {q.client?.name}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-mono">{rota}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Plane className="h-3 w-3" /> Voo: {dataVoo}
                        </p>
                      </div>
                    </div>
                    <div className="text-left md:text-right shrink-0">
                      <p className="text-sm text-muted-foreground">
                        {formatBRL(q.total_value)}
                      </p>
                      <p className="text-base font-bold text-success">
                        {formatBRL(q.comissaoCalculada)}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-xs text-success border-success/30"
                      >
                        {q.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
