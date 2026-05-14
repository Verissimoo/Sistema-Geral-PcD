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
import { localClient } from "@/api/localClient";
import { computeCommission } from "@/lib/pricingCalculator";
import { useAuth } from "@/lib/AuthContext";
import { RefreshCw, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const [partnerPriceMode, setPartnerPriceMode] = useState("valor"); // 'valor' | 'rav' | 'desconto'
  const [partnerRavValue, setPartnerRavValue] = useState(0);
  const [partnerDescontoValue, setPartnerDescontoValue] = useState(0);
  const [saving, setSaving] = useState(false);

  const isPartner = quote?.recipient_type === "parceiro";

  // Clona o pricing ao abrir o dialog. Resetar pricing pra null ao fechar
  // garante que reabrir com outro quote partirá do snapshot correto.
  useEffect(() => {
    if (open && quote) {
      const clonedPricing = clonePricing(quote.pricing);
      setPricing(clonedPricing);
      setPassengers(Math.max(1, parseInt(quote.passengers, 10) || 1));

      // Para parceiro, deduz o modo inicial pelo snapshot anterior (se existir)
      if (quote.recipient_type === "parceiro") {
        const savedMode = clonedPricing.partner_price_mode || "valor";
        setPartnerPriceMode(savedMode);
        setPartnerRavValue(Number(clonedPricing.partner_rav) || 0);
        setPartnerDescontoValue(Number(clonedPricing.partner_desconto) || 0);
      } else {
        setPartnerPriceMode("valor");
        setPartnerRavValue(0);
        setPartnerDescontoValue(0);
      }
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

  // Nipon usado pelos modos RAV/Desconto. É o nipon TOTAL (já × passageiros).
  const niponTotal = newTotals?.niponTotal || 0;

  // Valor de venda derivado para parceiro: em modo RAV/Desconto é calculado
  // a partir do nipon ± valor; em modo "valor" usa pricing.sale_value direto.
  const partnerSaleValue = useMemo(() => {
    if (!isPartner) return Number(pricing?.sale_value) || 0;
    if (partnerPriceMode === "rav") {
      return niponTotal + (Number(partnerRavValue) || 0);
    }
    if (partnerPriceMode === "desconto") {
      return niponTotal - (Number(partnerDescontoValue) || 0);
    }
    return Number(pricing?.sale_value) || 0;
  }, [isPartner, partnerPriceMode, partnerRavValue, partnerDescontoValue, niponTotal, pricing?.sale_value]);

  // Sincroniza pricing.sale_value quando muda o modo RAV/Desconto, para que
  // o comparativo lá embaixo (que lê newTotals via pricing) reflita o valor.
  // Em modo "valor" o input já escreve direto no pricing.sale_value.
  useEffect(() => {
    if (!isPartner) return;
    if (partnerPriceMode === "valor") return;
    setPricing((prev) => {
      if (!prev) return prev;
      const next = Number(partnerSaleValue) || 0;
      if (Math.abs((Number(prev.sale_value) || 0) - next) < 0.01 && prev.sale_per === "total") {
        return prev;
      }
      return { ...prev, sale_value: next, sale_per: "total" };
    });
  }, [isPartner, partnerPriceMode, partnerSaleValue]);

  // Para o modo "Valor final": mostrar automaticamente quanto sai como RAV/desconto
  const diferencaNipon = (Number(pricing?.sale_value) || 0) - niponTotal;
  const autoRav = diferencaNipon > 0 ? diferencaNipon : 0;
  const autoDesconto = diferencaNipon < 0 ? Math.abs(diferencaNipon) : 0;

  if (!open || !quote || !pricing || !oldTotals || !newTotals) return null;

  const isMilhas = pricing.type === "milhas";
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
      // Para parceiro: o valor de venda final é o calculado pelo modo (RAV/desconto/valor)
      const finalSaleValue = isPartner
        ? partnerSaleValue
        : Number(pricing.sale_value) || 0;
      const finalSalePer = isPartner ? "total" : pricing.sale_per || "total";

      // Pricing final inclui o sale_value/sale_per consolidado, snapshot do
      // nipon e — para parceiro — os campos auditáveis de RAV/Desconto/modo.
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
        pricingFinal.partner_price_mode = partnerPriceMode;
      }

      // Para parceiro o total_value é o que a PCD cobra dele (= finalSaleValue).
      // Esse mesmo valor também alimenta partner_base_sale_value (campo do
      // portal do parceiro: floor de margem que ele vê ao precificar).
      const updatePayload = {
        passengers,
        pricing: pricingFinal,
        total_value: nc.saleTotal,
        commission: {
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
        },
      };

      if (isPartner) {
        updatePayload.partner_base_sale_value = finalSaleValue;
      }

      const updated = await localClient.entities.Quotes.update(quote.id, updatePayload);

      if (!updated) {
        toast({
          title: "Erro ao salvar",
          description: "Tente novamente em instantes.",
          variant: "destructive",
        });
        return;
      }

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
            <RefreshCw className="w-5 h-5 text-amber-500" />
            Atualizar valores · {quote.quote_number}
          </DialogTitle>
          <DialogDescription>
            Voos e datas permanecem inalterados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* === CLIENTE + PASSAGEIROS === */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
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
                  <Badge variant="outline" className="text-amber-700 border-amber-400">
                    Era {quote.passengers}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* === MILHAS - SINGLE === */}
          {isMilhas && !isMultiProgram && !isSplit && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
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
                      "bg-slate-50 rounded-lg p-3 border-l-4",
                      isIda ? "border-l-red-500" : "border-l-blue-500"
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-bold mb-2",
                        isIda ? "text-red-700" : "text-blue-700"
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
                  className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                >
                  <p className="text-xs font-bold mb-2 text-slate-700">
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

          {/* === DINHEIRO === */}
          {!isMilhas && !isSplit && (
            <div className="bg-slate-50 rounded-lg p-4">
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

          {/* === VALOR DE VENDA — PARCEIRO (RAV/Desconto/Valor) === */}
          {isPartner ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold">Valor de venda à parceira</p>
                <p className="text-xs text-muted-foreground">
                  Nipon mínimo:{" "}
                  <strong>{formatBRL(niponTotal)}</strong>
                </p>
              </div>

              {/* Tabs do modo de entrada */}
              <div className="grid grid-cols-3 gap-1 bg-white rounded-md p-1">
                <button
                  type="button"
                  onClick={() => setPartnerPriceMode("valor")}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-medium transition",
                    partnerPriceMode === "valor"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Valor final
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerPriceMode("rav")}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-medium transition",
                    partnerPriceMode === "rav"
                      ? "bg-green-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  + RAV
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerPriceMode("desconto")}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-medium transition",
                    partnerPriceMode === "desconto"
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  − Desconto
                </button>
              </div>

              {/* Modo VALOR — input direto */}
              {partnerPriceMode === "valor" && (
                <div>
                  <Label className="text-xs">Valor que vou cobrar (total)</Label>
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
                    className="font-bold"
                    placeholder={formatBRL(niponTotal)}
                  />
                  {Number(pricing.sale_value) > 0 && (
                    <div className="mt-2 text-xs">
                      {autoRav > 0 && (
                        <p className="text-green-700">
                          + RAV de <strong>{formatBRL(autoRav)}</strong> sobre o Nipon
                        </p>
                      )}
                      {autoDesconto > 0 && (
                        <p className="text-red-700">
                          − Desconto de <strong>{formatBRL(autoDesconto)}</strong> sobre o Nipon
                        </p>
                      )}
                      {Math.abs(diferencaNipon) < 0.01 && (
                        <p className="text-slate-500">Vendendo exatamente pelo Nipon</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Modo RAV */}
              {partnerPriceMode === "rav" && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">RAV — quanto acima do Nipon</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={partnerRavValue || ""}
                      onChange={(e) => setPartnerRavValue(parseFloat(e.target.value) || 0)}
                      className="font-bold"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="bg-white rounded p-2 text-xs space-y-1 border border-green-200">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Nipon:</span>
                      <span>{formatBRL(niponTotal)}</span>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>+ RAV:</span>
                      <span className="font-bold">{formatBRL(partnerRavValue)}</span>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-1 mt-1 font-bold">
                      <span>Valor final:</span>
                      <span>{formatBRL(niponTotal + (Number(partnerRavValue) || 0))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Modo DESCONTO */}
              {partnerPriceMode === "desconto" && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Desconto — quanto abaixo do Nipon</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={partnerDescontoValue || ""}
                      onChange={(e) => setPartnerDescontoValue(parseFloat(e.target.value) || 0)}
                      className="font-bold"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="bg-white rounded p-2 text-xs space-y-1 border border-red-200">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Nipon:</span>
                      <span>{formatBRL(niponTotal)}</span>
                    </div>
                    <div className="flex justify-between text-red-700">
                      <span>− Desconto:</span>
                      <span className="font-bold">{formatBRL(partnerDescontoValue)}</span>
                    </div>
                    <div className="flex justify-between border-t border-red-200 pt-1 mt-1 font-bold">
                      <span>Valor final:</span>
                      <span>{formatBRL(niponTotal - (Number(partnerDescontoValue) || 0))}</span>
                    </div>
                  </div>
                  {Number(partnerDescontoValue) > 0 && (
                    <p className="text-xs text-amber-700">
                      ⚠️ Vendendo abaixo do Nipon. A PCD absorve{" "}
                      {formatBRL(partnerDescontoValue)}.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
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
          <div className="bg-slate-900 text-white rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-amber-400 font-bold mb-3">
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
                  label: "Nipon mínimo",
                  old: oldTotals.niponTotal,
                  new: newTotals.niponTotal,
                },
                {
                  label: "Venda",
                  old: oldTotals.saleTotal,
                  new: newTotals.saleTotal,
                },
                {
                  label: "Comissão",
                  old: oldTotals.total,
                  new: newTotals.total,
                  bold: true,
                },
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
                    <span className="text-slate-300">{row.label}</span>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="text-slate-400">{formatBRL(row.old)}</span>
                      <span className="text-slate-500">→</span>
                      <span>{formatBRL(row.new)}</span>
                      {!isZero && (
                        <span
                          className={cn(
                            "font-bold",
                            isImprovement ? "text-emerald-400" : "text-red-400"
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

          {/* === AVISO SE VENDA ABAIXO DO NIPON === */}
          {newTotals.saleTotal > 0 && newTotals.saleTotal < newTotals.niponTotal && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">
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
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
