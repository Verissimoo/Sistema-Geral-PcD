import { useCallback } from "react";
import { computePricingTotals, buildCommissionSnapshot } from "@/shared/lib/pricingCalculator";
import { FROZEN_STATUSES } from "@/features/orcamento/lib/priceFreshness";
import { formatBRL } from "@/shared/lib/format";

// Reprecifica um orçamento ainda não congelado usando o preço atual da
// tabela de milhas. Mantém o valor de venda (acordado com o cliente) e
// recalcula custo + comissão. Snapshot completo via pricingCalculator.
//
// Lógica idêntica que vivia em GerenteOrcamentos e VendedorOrcamentos.
export function useRecalculatePrice({ updateQuote, toast, onUpdated }) {
  return useCallback(
    async (quote, freshness) => {
      if (!freshness || freshness.isFresh) return;
      if (FROZEN_STATUSES.has(quote.status)) {
        toast({
          title: "Status congelado",
          description: "Cotações emitidas/canceladas/recusadas não podem ser reprecificadas.",
          variant: "destructive",
        });
        return;
      }
      const ok = window.confirm(
        `Atualizar o preço deste orçamento de ${formatBRL(freshness.usedPrice)}/mil para ${formatBRL(freshness.currentPrice)}/mil?\n\n` +
          "O custo será recalculado, mas o valor de venda ao cliente permanece. Margem e comissão são recalculados."
      );
      if (!ok) return;

      const newCostPerThousand = Number(freshness.currentPrice) || 0;
      const milesQty = Number(quote.pricing?.miles_qty) || 0;
      const newCostBrl = (milesQty / 1000) * newCostPerThousand;

      const tentativePricing = {
        ...(quote.pricing || {}),
        miles_value_per_thousand: newCostPerThousand,
        cost_brl: newCostBrl,
        cost_brl_calc: newCostBrl,
        reprecified_at: new Date().toISOString(),
      };
      // Sincroniza nipon_value snapshot com o cálculo dinâmico (custo × 1.10 ou
      // × 1.0 para Azul). Sem isso, o snapshot fica stale após o recalc.
      const derived = computePricingTotals({ ...quote, pricing: tentativePricing });
      const newPricing = { ...tentativePricing, nipon_value: derived.niponPerPax };
      const newCommission = buildCommissionSnapshot({ ...quote, pricing: newPricing });

      let updated;
      try {
        updated = await updateQuote.mutateAsync({
          id: quote.id,
          updates: { pricing: newPricing, commission: newCommission },
        });
      } catch {
        // Erro já notificado pelo toast central do queryClient.
        return;
      }
      toast({
        title: "Preço atualizado",
        description: "Custo e comissão recalculados com base na tabela atual.",
      });
      onUpdated?.(updated);
    },
    [updateQuote, toast, onUpdated]
  );
}
