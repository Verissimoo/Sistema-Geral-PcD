import { FileText, CheckCircle2, DollarSign, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { formatBRL } from "@/shared/lib/format";

export default function VendedorMetricCards({
  quotes,
  cotacoesMes,
  vendidos,
  pipeline,
  receitaTotal,
  receitaMes,
  taxaConversaoTotal,
  ticketMedio,
  clientesDoVendedor,
  followUpsPendentes,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
            <FileText className="w-4 h-4 text-accent" />
          </div>
          <p className="text-3xl font-semibold text-text-primary">{quotes.length}</p>
          <p className="text-xs text-text-muted font-medium mt-1">Cotações totais</p>
          <p className="text-[10px] text-text-muted mt-1">
            {cotacoesMes.length} este mês
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <p className="text-3xl font-semibold text-text-primary">{vendidos.length}</p>
          <p className="text-xs text-text-muted font-medium mt-1">Vendas emitidas</p>
          {pipeline.length > 0 && (
            <p className="text-[10px] text-warning font-medium mt-1">
              + {pipeline.length} em pipeline
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4 text-warning" />
          </div>
          <p className="text-2xl font-semibold text-text-primary">
            {formatBRL(receitaTotal)}
          </p>
          <p className="text-xs text-text-muted font-medium mt-1">Receita gerada</p>
          <p className="text-[10px] text-text-muted mt-1">
            {formatBRL(receitaMes)} no mês
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <p className="text-3xl font-semibold text-text-primary">
            {taxaConversaoTotal.toFixed(1)}%
          </p>
          <p className="text-xs text-text-muted font-medium mt-1">
            Taxa de conversão
          </p>
          <p className="text-[10px] text-text-muted mt-1">
            Ticket {formatBRL(ticketMedio)}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center mb-3">
            <Users className="w-4 h-4 text-danger" />
          </div>
          <p className="text-3xl font-semibold text-text-primary">
            {clientesDoVendedor.length}
          </p>
          <p className="text-xs text-text-muted font-medium mt-1">
            Clientes atendidos
          </p>
          {followUpsPendentes > 0 && (
            <p className="text-[10px] text-warning font-medium mt-1">
              {followUpsPendentes} follow-up pendente
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
