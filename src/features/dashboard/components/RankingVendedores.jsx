import { Trophy } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/shared/lib/format";
import { initials } from "@/features/dashboard/lib/dashboardUtils";

export function RankingVendedores({ topPerformers, maxSellerRevenue, periodo, navigate }) {
  return (
    <Card className="lg:col-span-3 p-6">
      <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-text-muted" />
        Ranking de Vendedores —{" "}
        {periodo === "7"
          ? "Últimos 7 dias"
          : periodo === "15"
            ? "Últimos 15 dias"
            : "Período"}
      </h3>

      {topPerformers.length === 0 ? (
        <p className="text-center text-text-muted py-6 text-sm">
          Nenhum vendedor com atividade no período.
        </p>
      ) : (
        <div className="space-y-1">
          {topPerformers.map((seller, idx) => (
            <div
              key={seller.id}
              onClick={() => navigate(`/gerente/vendedores/${seller.id}`)}
              className="flex items-center gap-3 p-3 rounded-md hover:bg-bg-elevated cursor-pointer transition-colors"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 tabular-nums",
                  idx === 0 && "bg-warning-subtle text-warning",
                  idx === 1 && "bg-bg-elevated text-text-secondary",
                  idx === 2 && "bg-brand-subtle text-brand",
                  idx > 2 && "bg-bg-elevated text-text-muted",
                )}
              >
                {idx + 1}
              </div>

              <div className="w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center font-medium text-xs text-text-secondary shrink-0">
                {initials(seller.name)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-text-primary truncate">{seller.name}</p>
                <div className="w-full bg-bg-elevated rounded-full h-1.5 mt-1">
                  <div
                    className="bg-brand h-1.5 rounded-full"
                    style={{
                      width: `${(seller.receita / maxSellerRevenue) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-semibold text-sm text-text-primary tabular-nums">
                  {formatBRL(seller.receita)}
                </p>
                <p className="text-[10px] text-text-muted tabular-nums">
                  {seller.vendas} vendas / {seller.cotacoes} cotações
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
