import { DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { sanitizeBRInput } from "@/shared/lib/parseBR";
import { formatBRL } from "@/shared/lib/format";

export function ParceiroPrecoCard({
  niponBase,
  saleValue,
  onSaleValueChange,
  saleValueNumber,
  margem,
  margemValida,
}) {
  return (
    <>
      {/* Custo recebido */}
      <Card className="border-border/50 bg-bg-elevated">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Valor Nipon (custo base recebido da equipe)
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Esse é o valor mínimo. Defina seu preço de venda acima dele para gerar margem.
            </div>
          </div>
          <div className="text-2xl font-bold text-primary">{formatBRL(niponBase)}</div>
        </CardContent>
      </Card>

      {/* Definir preço */}
      <Card className="border-accent/30 bg-accent/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" /> Valor de venda ao seu cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="sale">Valor de venda (R$) *</Label>
            <Input
              id="sale"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 2.500,00"
              value={saleValue}
              onChange={(e) => onSaleValueChange(sanitizeBRInput(e.target.value))}
              className="text-lg font-semibold"
            />
          </div>

          {saleValueNumber > 0 && (
            <div className={cn(
              "rounded-lg border p-3 text-sm flex items-start gap-2",
              margemValida
                ? "bg-success/10 border-success/30 text-success"
                : "bg-warning/10 border-warning/30 text-warning"
            )}>
              <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">
                  Sua margem: {formatBRL(margem)}
                </div>
                <div className="text-xs mt-0.5">
                  {margemValida
                    ? `Preço (${formatBRL(saleValueNumber)}) − Nipon (${formatBRL(niponBase)})`
                    : `Atenção: o preço está abaixo do Nipon — você teria prejuízo de ${formatBRL(Math.abs(margem))}.`}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
