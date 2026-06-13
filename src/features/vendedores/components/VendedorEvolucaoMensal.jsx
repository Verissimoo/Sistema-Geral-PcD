import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { formatBRL } from "@/shared/lib/format";

export default function VendedorEvolucaoMensal({ evolucaoMensal, maxReceita }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-text-secondary" />
          Evolução — últimos 6 meses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-2">
          {evolucaoMensal.map((mes) => {
            const pct = (mes.receita / maxReceita) * 100;
            return (
              <div key={mes.monthStr} className="flex flex-col items-center">
                <div className="w-full h-32 flex items-end justify-center relative group">
                  <div
                    className="w-12 bg-warning rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      minHeight: mes.receita > 0 ? "4px" : "0",
                    }}
                  />
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-bg-elevated text-text-primary text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                    <div className="font-semibold">{formatBRL(mes.receita)}</div>
                    <div className="text-[10px] text-text-muted">
                      {mes.vendas} vendas · {mes.cotacoes} cotações
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold mt-2">{mes.label}</p>
                <p className="text-[10px] text-text-muted">
                  {formatBRL(mes.receita)}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
