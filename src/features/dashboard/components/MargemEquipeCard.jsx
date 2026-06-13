import {
  TrendingUp, TrendingDown, Wallet, Receipt, PiggyBank,
} from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/shared/lib/format";

export function MargemEquipeCard({ margemEquipe }) {
  return (
    <Card>
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-text-muted" />
            <h3 className="text-base font-semibold text-text-primary">
              Margem da Equipe Comercial
            </h3>
          </div>
          <Badge variant="outline">
            {margemEquipe.vendas}{" "}
            {margemEquipe.vendas === 1 ? "venda emitida" : "vendas emitidas"} no período
          </Badge>
        </div>
        <p className="text-xs text-text-muted">
          Quanto a operação gerou de verdade — sem inflar com pipeline ou aprovados
        </p>
      </div>

      <div className="p-6">
        {margemEquipe.vendas === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            Sem vendas emitidas no período selecionado.
          </div>
        ) : (
          <>
            {/* Receita Total — referência (100%) */}
            <div className="mb-4 pb-4 border-b border-border-subtle">
              <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-accent" />
                  Receita Total (100%)
                </span>
                <span className="text-2xl font-semibold text-text-primary tabular-nums">
                  {formatBRL(margemEquipe.receitaTotal)}
                </span>
              </div>
              <div className="w-full bg-accent h-2 rounded-full" />
            </div>

            {/* Custo Direto */}
            <div className="mb-3">
              <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-danger" />
                  Custo Direto (milhas + taxas)
                </span>
                <div className="text-right">
                  <span className="font-semibold text-danger tabular-nums">
                    −{formatBRL(margemEquipe.custoTotal)}
                  </span>
                  <span className="text-xs text-text-muted ml-2 tabular-nums">
                    {margemEquipe.pctCusto.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
                <div
                  className="bg-danger h-2 transition-all duration-700"
                  style={{ width: `${Math.min(100, margemEquipe.pctCusto)}%` }}
                />
              </div>
            </div>

            {/* Margem Bruta (antes das comissões) */}
            <div className="mb-4 pb-4 border-b border-border-subtle">
              <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-warning" />
                  Margem Bruta (antes das comissões)
                </span>
                <div className="text-right">
                  <span className="text-xl font-semibold text-warning tabular-nums">
                    {formatBRL(margemEquipe.margemBruta)}
                  </span>
                  <span className="text-xs text-warning font-medium ml-2 tabular-nums">
                    {margemEquipe.pctMargemBruta.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
                <div
                  className="bg-warning h-2 transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(0, margemEquipe.pctMargemBruta))}%`,
                  }}
                />
              </div>
            </div>

            {/* Comissões pagas */}
            <div className="mb-3">
              <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-info" />
                  Comissões pagas aos vendedores
                </span>
                <div className="text-right">
                  <span className="font-semibold text-info tabular-nums">
                    −{formatBRL(margemEquipe.comissaoTotal)}
                  </span>
                  <span className="text-xs text-text-muted ml-2 tabular-nums">
                    {margemEquipe.pctComissoes.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
                <div
                  className="bg-info h-2 transition-all duration-700"
                  style={{ width: `${Math.min(100, margemEquipe.pctComissoes)}%` }}
                />
              </div>
            </div>

            {/* Margem Líquida — destaque final */}
            <div className="mt-4 bg-success-subtle border border-success/30 rounded-lg p-4">
              <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-success font-medium">
                    Margem Líquida da Agência
                  </p>
                  <p className="text-xs text-text-muted">
                    O que sobra de fato para a PCD após pagar custos + comissões
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "text-3xl font-semibold tabular-nums",
                      margemEquipe.margemLiquida >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {formatBRL(margemEquipe.margemLiquida)}
                  </span>
                  <div
                    className={cn(
                      "text-xs font-medium tabular-nums",
                      margemEquipe.margemLiquida >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {margemEquipe.pctMargemLiquida.toFixed(1)}% da receita
                  </div>
                </div>
              </div>

              {margemEquipe.pctMargemLiquida >= 30 && (
                <div className="mt-2 text-xs text-success flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  Margem saudável — operação rentável
                </div>
              )}
              {margemEquipe.pctMargemLiquida >= 15 &&
                margemEquipe.pctMargemLiquida < 30 && (
                  <div className="mt-2 text-xs text-warning flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    Margem moderada — atenção aos descontos
                  </div>
                )}
              {margemEquipe.pctMargemLiquida < 15 &&
                margemEquipe.pctMargemLiquida >= 0 && (
                  <div className="mt-2 text-xs text-warning flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    Margem apertada — revisar precificação
                  </div>
                )}
              {margemEquipe.pctMargemLiquida < 0 && (
                <div className="mt-2 text-xs text-danger flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-danger" />
                  Operação no prejuízo — comissões maiores que a margem bruta
                </div>
              )}
            </div>

            {/* Sumário por venda */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border-subtle">
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                  Ticket médio
                </p>
                <p className="text-base font-semibold text-text-primary tabular-nums">
                  {formatBRL(margemEquipe.receitaTotal / Math.max(1, margemEquipe.vendas))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                  Lucro / venda
                </p>
                <p className="text-base font-semibold text-warning tabular-nums">
                  {formatBRL(margemEquipe.margemBruta / Math.max(1, margemEquipe.vendas))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                  Líquido / venda
                </p>
                <p
                  className={cn(
                    "text-base font-semibold tabular-nums",
                    margemEquipe.margemLiquida >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {formatBRL(margemEquipe.margemLiquida / Math.max(1, margemEquipe.vendas))}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
