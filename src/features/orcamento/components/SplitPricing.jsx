import { Info } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/shared/lib/format";
import TrechoPricingCard from "@/features/orcamento/components/TrechoPricingCard";

// ─── Quebra de Trecho — múltiplas emissões ─────────────────────────
export default function SplitPricing({ trechos, milesTable, onChange, passengers = 1 }) {
  const niponPorPessoa = trechos.reduce((s, t) => s + (Number(t.nipon_value) || 0), 0);
  const custoPorPessoa = trechos.reduce((s, t) => s + (Number(t.cost_total) || 0), 0);
  const totalNipon = niponPorPessoa * passengers;
  const totalCost = custoPorPessoa * passengers;
  const totalMargin = totalNipon - totalCost;

  if (trechos.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted/40 border border-dashed text-sm text-muted-foreground text-center">
        Adicione trechos no Bloco 3 para configurar a precificação por trecho.
      </div>
    );
  }

  if (trechos.length === 1) {
    return (
      <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-sm text-warning">
        <strong>Quebra de Trecho precisa de 2+ voos.</strong> Adicione um segmento (escala) ou
        volte ao tipo de bilhete <em>Normal</em> no Bloco 3.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
        <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div className="text-warning dark:text-warning">
          <strong>Quebra de Trecho:</strong> cada voo pode ser emitido com método
          diferente (ex: BSB→GRU em milhas Latam, GRU→MIA em milhas Smiles, ou um voo em milhas e outro em dinheiro).
        </div>
      </div>

      {trechos.map((trecho, idx) => (
        <TrechoPricingCard
          key={trecho.key || idx}
          trecho={trecho}
          index={idx}
          milesTable={milesTable}
          onChange={(updated) => onChange(idx, updated)}
        />
      ))}

      {/* Totais consolidados */}
      <Card className="bg-bg-elevated text-text-primary border-border-strong">
        <CardContent className="p-5 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-text-muted">
            Totais consolidados {passengers >= 2 ? `· soma trechos × ${passengers} pax` : ""}
          </div>
          {passengers >= 2 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Custo por pessoa:</span>
                <span className="font-semibold">{formatBRL(custoPorPessoa)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Nipon por pessoa:</span>
                <span className="font-semibold text-warning">{formatBRL(niponPorPessoa)}</span>
              </div>
              <Separator className="my-2 bg-bg-overlay" />
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Custo total:</span>
            <span className="font-semibold">{formatBRL(totalCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Valor Nipon total:</span>
            <span className="font-semibold text-warning">{formatBRL(totalNipon)}</span>
          </div>
          <Separator className="my-2 bg-bg-overlay" />
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Margem bruta:</span>
            <span className={cn("font-semibold", totalMargin >= 0 ? "text-success" : "text-danger")}>
              {formatBRL(totalMargin)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
