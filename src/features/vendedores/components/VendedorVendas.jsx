import { CheckCircle2, Users, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { computeCommission } from "@/shared/lib/pricingCalculator";
import { formatBRL } from "@/shared/lib/format";
import { formatDate, getRota } from "./vendedorDetalheShared";

export default function VendedorVendas({ vendidos, topClientes, navigate }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Vendas realizadas
          </CardTitle>
          <Badge variant="outline">{vendidos.length} no total</Badge>
        </CardHeader>
        <CardContent>
          {vendidos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Nenhuma venda emitida ainda.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {[...vendidos]
                .sort(
                  (a, b) =>
                    new Date(
                      b.emission_completed_date || b.issued_date || b.created_date || 0
                    ).getTime() -
                    new Date(
                      a.emission_completed_date || a.issued_date || a.created_date || 0
                    ).getTime()
                )
                .slice(0, 10)
                .map((q) => {
                  const dataEmissao =
                    q.emission_completed_date || q.issued_date || q.created_date;
                  const comissao = computeCommission(q).total;
                  return (
                    <div
                      key={q.id}
                      onClick={() => navigate(`/gerente/orcamentos?id=${q.id}`)}
                      className="flex items-center gap-3 p-3 bg-bg-elevated hover:bg-bg-elevated rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-text-secondary">
                            {q.quote_number || `#${q.id?.slice(0, 8)}`}
                          </span>
                          <Badge className="bg-success/10 text-success border-success/30 text-xs">
                            Emitido
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-text-primary mt-1 truncate">
                          {q.client?.name || q.partner_name || "—"}
                        </p>
                        <p className="text-xs text-text-muted">
                          {getRota(q)} · {formatDate(dataEmissao)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-sm">{formatBRL(q.total_value)}</p>
                        {comissao > 0 && (
                          <p className="text-[10px] text-success font-medium">
                            Comissão {formatBRL(comissao)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-danger" />
            Top 5 clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topClientes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Sem clientes recorrentes ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {topClientes.map((c, idx) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-elevated transition-colors"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0
                        ? "bg-warning/10 text-warning"
                        : idx === 1
                          ? "bg-bg-elevated text-text-secondary"
                          : idx === 2
                            ? "bg-warning/10 text-warning"
                            : "bg-bg-elevated text-text-muted"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    <p className="text-[10px] text-text-muted">
                      {c.count} {c.count === 1 ? "venda" : "vendas"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{formatBRL(c.total)}</p>
                    {c.phone && (
                      <a
                        href={`https://wa.me/${String(c.phone).replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-success hover:text-success text-[10px] flex items-center gap-0.5 justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
