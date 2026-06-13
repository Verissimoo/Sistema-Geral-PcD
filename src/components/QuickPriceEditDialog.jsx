import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { updateQuote } from "@/api/quotes";
import { queryClientInstance } from "@/lib/query-client";
import { computeCommission } from "@/lib/pricingCalculator";
import { useAuth } from "@/lib/AuthContext";
import { RefreshCw, Minus, Plus, AlertTriangle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/shared/lib/format";

// Clona o pricing original — useState mantém referência local mutável durante
// a edição. Sem o clone profundo, alterar trechos_pricing[i].miles_qty
// vazaria mutação no objeto do banco que ainda está sendo exibido por trás.
function clonePricing(p) {
  if (!p) return {};
  try {
    return JSON.parse(JSON.stringify(p));
  } catch {
    return { ...p };
  }
}

export default function QuickPriceEditDialog({ open, onOpenChange, quote, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pricing, setPricing] = useState(null);
  const [passengers, setPassengers] = useState(1);
  const [saving, setSaving] = useState(false);

  const isPartner = quote?.recipient_type === "parceiro";

  // Clona o pricing ao abrir o dialog. Resetar pricing pra null ao fechar
  // garante que reabrir com outro quote partirá do snapshot correto.
  useEffect(() => {
    if (open && quote) {
      setPricing(clonePricing(quote.pricing));
      setPassengers(Math.max(1, parseInt(quote.passengers, 10) || 1));
    } else if (!open) {
      setPricing(null);
    }
  }, [open, quote]);

  // Comparativo antes vs depois — sempre baseado em computeCommission,
  // que é a fonte única de verdade (lida custo + multi-program + carteira
  // própria + 45% sobre excedente etc).
  const oldTotals = useMemo(
    () => (quote ? computeCommission(quote) : null),
    [quote]
  );
  const newTotals = useMemo(
    () =>
      quote && pricing
        ? computeCommission({ ...quote, pricing, passengers })
        : null,
    [quote, pricing, passengers]
  );

  // Nipon TOTAL (já × passageiros) — usado como referência sugerida pro parceiro.
  const niponTotal = newTotals?.niponTotal || 0;
  const costTotal = newTotals?.costTotal || 0;

  if (!open || !quote || !pricing || !oldTotals || !newTotals) return null;

  const isMilhas = pricing.type === "milhas";
  const isMilhasDinheiro = pricing.type === "milhas_dinheiro";
  const isMultiProgram = pricing.multi_program === true;
  const isSplit = pricing.is_split === true;
  const passengersChanged = passengers !== (parseInt(quote.passengers, 10) || 1);

  const updateField = (field, value) => {
    setPricing((prev) => ({ ...prev, [field]: value }));
  };

  const updateTrechoPricing = (idx, field, value) => {
    setPricing((prev) => {
      const novos = [...(prev.trechos_pricing || [])];
      novos[idx] = { ...novos[idx], [field]: value };
      return { ...prev, trechos_pricing: novos };
    });
  };

  const updateSplitTrecho = (idx, field, value) => {
    setPricing((prev) => {
      const novos = [...(prev.trechos || [])];
      novos[idx] = { ...novos[idx], [field]: value };
      // Recalcula cost_total e nipon_value do trecho (mesma fórmula do gerador)
      const t = novos[idx];
      const milhas = Number(t.miles_qty) || 0;
      const tax = Number(t.tax) || 0;
      if (t.type === "milhas") {
        const cpt = Number(t.miles_value_per_thousand) || Number(t.cost_per_thousand) || 0;
        const spt = Number(t.sale_value_per_thousand) || Number(t.sale_per_thousand) || cpt;
        t.cost_total = (milhas / 1000) * cpt + tax;
        t.nipon_value = t.is_azul ? t.cost_total : (milhas / 1000) * spt + tax;
      } else {
        const cost = Number(t.cost_brl) || 0;
        const base = cost + tax;
        t.cost_total = base;
        t.nipon_value = t.is_azul ? base : base * 1.10;
      }
      const total_cost = novos.reduce((s, x) => s + (Number(x.cost_total) || 0), 0);
      const total_nipon = novos.reduce((s, x) => s + (Number(x.nipon_value) || 0), 0);
      return { ...prev, trechos: novos, total_cost, total_nipon };
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const finalSaleValue = Number(pricing.sale_value) || 0;
      const finalSalePer = isPartner ? "total" : pricing.sale_per || "total";

      // Pricing final inclui o sale_value/sale_per consolidado, snapshot do
      // nipon e — para parceiro — os campos auditáveis de RAV/Desconto.
      const finalDiff = finalSaleValue - niponTotal;
      const pricingForCalc = { ...pricing, sale_value: finalSaleValue, sale_per: finalSalePer };
      const nc = computeCommission({ ...quote, pricing: pricingForCalc, passengers });

      const pricingFinal = {
        ...pricingForCalc,
        nipon_value: nc.niponPerPax,
        cost_brl_calc: nc.costPerPax - (Number(pricing.tax) || 0),
        suggested_price: pricing.suggested_price || 0,
      };

      if (isPartner) {
        pricingFinal.partner_rav = finalDiff > 0 ? finalDiff : 0;
        pricingFinal.partner_desconto = finalDiff < 0 ? Math.abs(finalDiff) : 0;
      }

      // Parceiro não gera comissão para vendedor PCD — gravamos snapshot zerado.
      const commissionPayload = isPartner
        ? {
            base: 0,
            extra: 0,
            total: 0,
            base_rate: 0,
            _note: "Sem comissão — venda a parceiro",
            recalculated_at: new Date().toISOString(),
            recalculated_by: user?.name || null,
          }
        : {
            base: nc.comissaoBase,
            extra: nc.comissaoExtra,
            total: nc.total,
            base_rate: nc.baseRate,
            cost_per_pax: nc.costPerPax,
            nipon_per_pax: nc.niponPerPax,
            cost_total: nc.costTotal,
            nipon_total: nc.niponTotal,
            passengers: nc.passengers,
            is_carteira_propria: nc.isCarteiraPropria,
            recalculated_at: new Date().toISOString(),
            recalculated_by: user?.name || null,
          };

      const updatePayload = {
        passengers,
        pricing: pricingFinal,
        total_value: nc.saleTotal,
        commission: commissionPayload,
      };

      if (isPartner) {
        updatePayload.partner_base_sale_value = finalSaleValue;
      }

      // updateQuote lança em caso de falha (o antigo localClient retornava
      // null) — o catch abaixo já exibe o toast de erro.
      const updated = await updateQuote(quote.id, updatePayload);

      // Telas que abrem este dialog leem de useQuotes() — invalida o cache
      // para refletir os novos valores imediatamente.
      queryClientInstance.invalidateQueries({ queryKey: ["quotes"] });

      onSaved?.(updated);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-warning" />
            Atualizar valores · {quote.quote_number}
          </DialogTitle>
          <DialogDescription>
            Voos e datas permanecem inalterados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* === CLIENTE + PASSAGEIROS === */}
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold">
                Cliente:{" "}
                <span className="font-normal">
                  {quote.client?.name || quote.partner_name || "—"}
                </span>
              </p>
              <Badge variant="outline">
                {isPartner ? "👥 Parceiro" : "👤 Cliente direto"}
              </Badge>
            </div>

            <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
              <Label className="text-xs font-medium">Passageiros</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                  disabled={passengers <= 1}
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max="9"
                  value={passengers}
                  onChange={(e) =>
                    setPassengers(
                      Math.max(1, Math.min(9, parseInt(e.target.value, 10) || 1))
                    )
                  }
                  className="text-center h-8 w-16"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPassengers((p) => Math.min(9, p + 1))}
                  disabled={passengers >= 9}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                {passengersChanged && (
                  <Badge variant="outline" className="text-warning border-warning/30">
                    Era {quote.passengers}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* === MILHAS - SINGLE === */}
          {isMilhas && !isMultiProgram && !isSplit && (
            <div className="bg-bg-elevated rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">
                {pricing.program_name || pricing.program || "Programa de milhas"}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Milhas (por pax)</Label>
                  <Input
                    type="number"
                    value={pricing.miles_qty ?? ""}
                    onChange={(e) =>
                      updateField("miles_qty", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">R$/mil (custo)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricing.miles_value_per_thousand ?? ""}
                    onChange={(e) =>
                      updateField(
                        "miles_value_per_thousand",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Taxa (por pax)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricing.tax ?? ""}
                    onChange={(e) =>
                      updateField("tax", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* === MILHAS - MULTI-PROGRAMA === */}
          {isMilhas && isMultiProgram && (
            <div className="space-y-2">
              {(pricing.trechos_pricing || []).map((tp, idx) => {
                const isIda = tp.tipo === "ida";
                return (
                  <div
                    key={idx}
                    className={cn(
                      "bg-bg-elevated rounded-lg p-3 border-l-4",
                      isIda ? "border-l-red-500" : "border-l-blue-500"
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-bold mb-2",
                        isIda ? "text-danger" : "text-accent"
                      )}
                    >
                      {isIda ? "🛫 IDA" : "🛬 VOLTA"} ·{" "}
                      {tp.program_name || "Programa"}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">Milhas/pax</Label>
                        <Input
                          type="number"
                          value={tp.miles_qty ?? ""}
                          onChange={(e) =>
                            updateTrechoPricing(
                              idx,
                              "miles_qty",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">R$/mil</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={tp.cost_per_thousand ?? ""}
                          onChange={(e) =>
                            updateTrechoPricing(
                              idx,
                              "cost_per_thousand",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Taxa/pax</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={tp.tax ?? ""}
                          onChange={(e) =>
                            updateTrechoPricing(
                              idx,
                              "tax",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* === QUEBRA DE TRECHO === */}
          {isSplit && (
            <div className="space-y-2">
              {(pricing.trechos || []).map((t, idx) => (
                <div
                  key={idx}
                  className="bg-bg-elevated rounded-lg p-3 border border-border"
                >
                  <p className="text-xs font-bold mb-2 text-text-secondary">
                    {t.label || `Trecho ${idx + 1}`}
                    {t.program_name ? ` · ${t.program_name}` : ""}
                  </p>
                  {t.type === "milhas" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Milhas/pax</Label>
                        <Input
                          type="number"
                          value={t.miles_qty ?? ""}
                          onChange={(e) =>
                            updateSplitTrecho(
                              idx,
                              "miles_qty",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Taxa/pax</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={t.tax ?? ""}
                          onChange={(e) =>
                            updateSplitTrecho(
                              idx,
                              "tax",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Custo/pax (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={t.cost_brl ?? ""}
                          onChange={(e) =>
                            updateSplitTrecho(
                              idx,
                              "cost_brl",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Taxa/pax</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={t.tax ?? ""}
                          onChange={(e) =>
                            updateSplitTrecho(
                              idx,
                              "tax",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* === MILHAS + DINHEIRO (tarifa híbrida Azul) === */}
          {isMilhasDinheiro && !isSplit && (
            <div className="bg-bg-elevated rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">
                Milhas + Dinheiro · {pricing.program_name || pricing.program || "Azul"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Milhas (por pax)</Label>
                  <Input
                    type="number"
                    value={pricing.miles_qty ?? ""}
                    onChange={(e) =>
                      updateField("miles_qty", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">R$/mil (custo)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricing.cost_per_thousand ?? ""}
                    onChange={(e) =>
                      updateField("cost_per_thousand", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Dinheiro (por pax)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricing.cash_part ?? ""}
                    onChange={(e) =>
                      updateField("cash_part", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Taxa (por pax)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricing.tax ?? ""}
                    onChange={(e) =>
                      updateField("tax", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* === DINHEIRO === */}
          {!isMilhas && !isMilhasDinheiro && !isSplit && (
            <div className="bg-bg-elevated rounded-lg p-4">
              <p className="text-sm font-semibold mb-3">Compra em dinheiro</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Custo (por pax)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricing.cost_brl ?? ""}
                    onChange={(e) =>
                      updateField("cost_brl", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Taxa (por pax)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricing.tax ?? ""}
                    onChange={(e) =>
                      updateField("tax", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* === VALOR DE VENDA — PARCEIRO (input livre + feedback contextual) === */}
          {isPartner ? (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">Valor da passagem para a parceira</p>
                <p className="text-xs text-muted-foreground">
                  Você define livremente. Nipon é apenas referência sugerida.
                </p>
              </div>

              {/* Sugestão informativa: custo + Nipon */}
              <div className="bg-bg-surface border border-border rounded-lg p-2.5 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo total da PCD:</span>
                  <strong className="text-text-secondary">{formatBRL(costTotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nipon (sugestão de venda):</span>
                  <strong className="text-warning">{formatBRL(niponTotal)}</strong>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Valor que vou cobrar da parceira (total)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pricing.sale_value ?? ""}
                  onChange={(e) =>
                    setPricing((prev) => ({
                      ...prev,
                      sale_value: parseFloat(e.target.value) || 0,
                      sale_per: "total",
                    }))
                  }
                  className="font-bold text-base h-11"
                  placeholder={`Sugerido: ${formatBRL(niponTotal)}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setPricing((prev) => ({
                      ...prev,
                      sale_value: niponTotal,
                      sale_per: "total",
                    }))
                  }
                  className="text-xs text-warning hover:text-warning underline mt-1"
                >
                  Usar valor sugerido (Nipon)
                </button>
              </div>

              {/* Feedback contextual: prejuízo / margem comprimida / lucro */}
              {(() => {
                const venda = Number(pricing.sale_value) || 0;
                if (venda === 0) return null;

                const lucroBruto = venda - costTotal;
                const acimaNipon = venda - niponTotal;

                if (venda < costTotal) {
                  const prejuizo = costTotal - venda;
                  return (
                    <div className="bg-danger/10 border-2 border-danger/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-danger text-sm">⚠️ Venda abaixo do custo</p>
                          <p className="text-xs text-danger mt-1">
                            Você está vendendo {formatBRL(prejuizo)} <strong>abaixo do que a PCD pagou</strong>.
                            Isso significa <strong>prejuízo direto</strong> de {formatBRL(prejuizo)}.
                          </p>
                          <p className="text-[10px] text-danger mt-1.5">
                            Custo PCD: {formatBRL(costTotal)} · Sua venda: {formatBRL(venda)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (venda < niponTotal) {
                  const descontoNipon = niponTotal - venda;
                  return (
                    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-warning text-sm">
                            Lucro de {formatBRL(lucroBruto)}
                          </p>
                          <p className="text-xs text-warning mt-1">
                            Você está vendendo {formatBRL(descontoNipon)} <strong>abaixo do Nipon sugerido</strong> — margem comprimida.
                          </p>
                          <p className="text-[10px] text-warning mt-1.5">
                            Custo: {formatBRL(costTotal)} → Venda: {formatBRL(venda)} ({((lucroBruto / venda) * 100).toFixed(1)}% margem)
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="bg-success/10 border-2 border-success/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-5 h-5 text-success shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-success text-sm">
                          Lucro de {formatBRL(lucroBruto)} ({((lucroBruto / venda) * 100).toFixed(1)}% margem)
                        </p>
                        <p className="text-xs text-success mt-1">
                          {acimaNipon > 0 && (
                            <>+{formatBRL(acimaNipon)} <strong>acima do Nipon sugerido</strong> — </>
                          )}
                          Operação saudável. PCD lucra {formatBRL(lucroBruto)} nessa venda.
                        </p>
                        <p className="text-[10px] text-success mt-1.5">
                          Custo: {formatBRL(costTotal)} → Venda: {formatBRL(venda)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-sm font-semibold mb-3">Valor de venda ao cliente</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Modo</Label>
                  <Select
                    value={pricing.sale_per || "total"}
                    onValueChange={(v) => updateField("sale_per", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Total da operação</SelectItem>
                      <SelectItem value="pessoa">Por pessoa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">
                    Valor {pricing.sale_per === "pessoa" ? "por pessoa" : "total"}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricing.sale_value ?? ""}
                    onChange={(e) =>
                      updateField("sale_value", parseFloat(e.target.value) || 0)
                    }
                    className="font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* === COMPARATIVO === */}
          <div className="bg-bg-elevated text-text-primary rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-warning font-bold mb-3">
              Impacto da alteração
            </p>
            <div className="space-y-1.5 text-xs">
              {[
                {
                  label: "Custo total",
                  old: oldTotals.costTotal,
                  new: newTotals.costTotal,
                  inverse: true,
                },
                {
                  label: isPartner ? "Nipon (referência)" : "Nipon mínimo",
                  old: oldTotals.niponTotal,
                  new: newTotals.niponTotal,
                },
                {
                  label: "Venda",
                  old: oldTotals.saleTotal,
                  new: newTotals.saleTotal,
                  bold: isPartner,
                },
                ...(isPartner
                  ? []
                  : [
                      {
                        label: "Comissão",
                        old: oldTotals.total,
                        new: newTotals.total,
                        bold: true,
                      },
                    ]),
              ].map((row, idx) => {
                const diff = row.new - row.old;
                const isImprovement = row.inverse ? diff < 0 : diff > 0;
                const isZero = Math.abs(diff) < 0.01;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between gap-3",
                      row.bold && "pt-2 mt-1 border-t border-white/10 font-bold"
                    )}
                  >
                    <span className="text-text-muted">{row.label}</span>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="text-text-muted">{formatBRL(row.old)}</span>
                      <span className="text-text-muted">→</span>
                      <span>{formatBRL(row.new)}</span>
                      {!isZero && (
                        <span
                          className={cn(
                            "font-bold",
                            isImprovement ? "text-success" : "text-danger"
                          )}
                        >
                          ({diff > 0 ? "+" : ""}
                          {formatBRL(diff)})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* === AVISO SE VENDA ABAIXO DO NIPON (cliente direto) === */}
          {!isPartner && newTotals.saleTotal > 0 && newTotals.saleTotal < newTotals.niponTotal && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-2.5 text-xs text-danger">
              ⚠️ Venda abaixo do Nipon mínimo. Faltam{" "}
              <strong>
                {formatBRL(newTotals.niponTotal - newTotals.saleTotal)}
              </strong>{" "}
              para cobrir a margem mínima.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-warning hover:bg-warning text-white"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
