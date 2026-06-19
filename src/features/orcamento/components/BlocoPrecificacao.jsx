import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, Info, Sparkles, DollarSign, Wallet, Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { cn } from "@/shared/lib/utils";
import { useMilesTable } from "@/api/hooks";
import { getCostForMiles, getSaleForMiles, getTierForMiles } from "@/features/milhas/milesHelper";
import { parseBR, sanitizeBRInput } from "@/shared/lib/parseBR";
import { useEurBrlRate } from "@/shared/hooks/useExchangeRate";
import { convertEurToBrl, convertBrlToEur, formatEUR } from "@/shared/lib/exchangeRate";
import ExchangeRateBadge from "@/shared/components/ExchangeRateBadge";
import { formatBRL } from "@/shared/lib/format";
import { emissionBlockCN, EMPTY_EMISSION_BLOCK } from "@/features/orcamento/lib/orcamentoHelpers";
import Row from "@/features/orcamento/components/Row";
import EmissionBlockEditor from "@/features/orcamento/components/EmissionBlockEditor";
import SplitPricing from "@/features/orcamento/components/SplitPricing";
import MultiProgramPricing from "@/features/orcamento/components/MultiProgramPricing";

// ─── Bloco 4 — Precificação ─────────────────────────────────────────
export default function BlocoPrecificacao({ formData, setFormData }) {
  const { data: milesTable = [] } = useMilesTable();
  // Moeda da operação: BRL (padrão) ou EUR (compra/venda em euro).
  // Quando EUR, os inputs aceitam euro e o sistema converte para BRL
  // via cotação ao vivo da AwesomeAPI — BRL é a moeda canônica do banco.
  const [currency, setCurrency] = useState(formData.pricing?.currency || "BRL");
  const { rate: eurBrlRate } = useEurBrlRate();
  const eurRate = eurBrlRate?.rate || 0;
  const isEur = currency === "EUR";

  // Persiste a moeda escolhida e a cotação no pricing — usado por persistQuote,
  // PDF e relatórios. Atualiza apenas se mudou (evita loop).
  useEffect(() => {
    setFormData((prev) => {
      const p = prev.pricing || {};
      const sameCurrency = (p.currency || "BRL") === currency;
      const sameRate = isEur && Math.abs((Number(p.exchange_rate_eur_brl) || 0) - eurRate) < 0.0001;
      if (sameCurrency && (!isEur || sameRate)) return prev;
      return {
        ...prev,
        pricing: {
          ...p,
          currency,
          ...(isEur && eurRate > 0 ? {
            exchange_rate_eur_brl: eurRate,
            exchange_rate_snapshot_at: new Date().toISOString(),
          } : {}),
        },
      };
    });
  }, [currency, eurRate, isEur, setFormData]);

  // Helpers para inputs em EUR — converte do EUR digitado para BRL armazenado.
  // Mantém também o snapshot em EUR (cost_eur, tax_eur, sale_value_eur) para
  // exibição no PDF e auditoria do valor original cotado pelo vendedor.
  const setEurField = (eurField, brlField, eurValue) => {
    const eur = parseFloat(String(eurValue).replace(",", ".")) || 0;
    const brl = eurRate > 0 ? eur * eurRate : 0;
    setFormData((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [eurField]: eur,
        [brlField]: brl ? brl.toFixed(2).replace(".", ",") : "",
      },
    }));
  };

  const isSplit = formData.ticket_type === "Quebra de Trecho";
  const isParceiroMode = formData.recipient_type === "parceiro";
  const isMultiProgram = formData.pricing?.multi_program === true;
  const trechosCount = (formData.itinerary?.trechos || []).length;
  // Multi-programa só faz sentido em IDA+VOLTA fora de Quebra de Trecho
  const canMultiProgram = !isSplit && trechosCount >= 2;

  // Achata trechos × segmentos em "unidades de emissão" para Quebra de Trecho.
  // Cada segmento (voo individual) vira um card de precificação separado, o
  // que generaliza o caso só-ida-com-conexão (1 trecho × 2 segs = 2 cards) e
  // mantém ida+volta single-segment (2 trechos × 1 seg cada = 2 cards).
  const splitUnits = useMemo(() => {
    const itinTrechos = formData.itinerary?.trechos || [];
    const units = [];
    for (const trecho of itinTrechos) {
      const segs = Array.isArray(trecho.segmentos) && trecho.segmentos.length > 0
        ? trecho.segmentos
        : [trecho];
      segs.forEach((seg, segIdx) => {
        const tipoLabel = trecho.tipo === "ida" ? "Ida" : "Volta";
        const segSuffix = segs.length > 1 ? ` ${segIdx + 1}` : "";
        const origem = seg.origem_iata || trecho.origem_iata || "?";
        const destino = seg.destino_iata || trecho.destino_iata || "?";
        units.push({
          key: `${trecho.tipo || "ida"}-${segIdx}`,
          tipo: trecho.tipo || "ida",
          segIdx,
          label: `${tipoLabel}${segSuffix} — ${origem} → ${destino}`,
        });
      });
    }
    return units;
  }, [formData.itinerary]);

  // Quebra de Trecho: requer ≥2 voos totais (segmentos) — inclui só-ida-com-conexão.
  const totalVoos = splitUnits.length;
  const elegivelQuebraTrecho = totalVoos >= 2;

  // Inicialização automática do modo split conforme ticket_type / itinerário.
  useEffect(() => {
    if (isSplit) {
      setFormData((prev) => {
        const existing = prev.pricing?.trechos || [];
        const newTrechos = splitUnits.map((u, idx) => {
          // Preserva entradas anteriores quando a posição/key coincide.
          const prior = existing.find((x) => x.key === u.key) || existing[idx];
          return prior
            ? { ...prior, label: u.label, key: u.key, tipo: u.tipo, segIdx: u.segIdx }
            : {
                key: u.key,
                label: u.label,
                tipo: u.tipo,
                segIdx: u.segIdx,
                type: "milhas",
                program_id: "",
                program_name: "",
                miles_qty: "",
                tax: "",
                cost_brl: "",
                is_azul: false,
                nipon_value: 0,
                cost_total: 0,
              };
        });
        return {
          ...prev,
          pricing: { ...prev.pricing, is_split: true, trechos: newTrechos },
        };
      });
    } else {
      setFormData((prev) => {
        if (!prev.pricing?.is_split && !prev.pricing?.trechos) return prev;
        const next = { ...prev.pricing, is_split: false };
        delete next.trechos;
        delete next.total_nipon;
        delete next.total_cost;
        return { ...prev, pricing: next };
      });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionalmente estreitas (efeito de sync); incluir as faltantes mudaria comportamento
  }, [isSplit, totalVoos, splitUnits.map((u) => u.key).join("|")]);

  // Multi-programa só faz sentido enquanto !isSplit. Se mudar pra split, limpa.
  useEffect(() => {
    if (!canMultiProgram && isMultiProgram) {
      setFormData((prev) => {
        const next = { ...prev.pricing, multi_program: false };
        delete next.trechos_pricing;
        return { ...prev, pricing: next };
      });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionalmente estreitas (efeito de sync); incluir as faltantes mudaria comportamento
  }, [canMultiProgram]);

  // Sincroniza trechos_pricing com os trechos do itinerário (mantém ordem,
  // preserva entradas já preenchidas, cria placeholders para novos).
  useEffect(() => {
    if (!isMultiProgram) return;
    const trechosItin = formData.itinerary?.trechos || [];
    setFormData((prev) => {
      const existing = prev.pricing?.trechos_pricing || [];
      const novos = trechosItin.map((t, idx) => {
        const prior = existing.find((x) => x.tipo === t.tipo) || existing[idx];
        return prior
          ? { ...prior, tipo: t.tipo }
          : {
              tipo: t.tipo || "ida",
              program_id: "",
              program_name: "",
              miles_qty: "",
              tax: "",
              cost_per_thousand: 0,
              sale_per_thousand: 0,
              is_azul: false,
            };
      });
      const same =
        existing.length === novos.length &&
        existing.every((e, i) => e.tipo === novos[i].tipo);
      if (same) return prev;
      return { ...prev, pricing: { ...prev.pricing, trechos_pricing: novos } };
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionalmente estreitas (efeito de sync); incluir as faltantes mudaria comportamento
  }, [isMultiProgram, formData.itinerary?.trechos?.length, formData.itinerary?.trechos?.map((t) => t.tipo).join("|")]);

  const updateMultiTrechoPricing = (idx, patch) => {
    setFormData((prev) => {
      const arr = [...(prev.pricing?.trechos_pricing || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, pricing: { ...prev.pricing, trechos_pricing: arr } };
    });
  };

  const updateTrechoPricing = (idx, updatedTrecho) => {
    setFormData((prev) => {
      const cur = prev.pricing?.trechos || [];
      const newTrechos = [...cur];
      newTrechos[idx] = updatedTrecho;
      const total_nipon = newTrechos.reduce((s, t) => s + (Number(t.nipon_value) || 0), 0);
      const total_cost = newTrechos.reduce((s, t) => s + (Number(t.cost_total) || 0), 0);
      return {
        ...prev,
        pricing: {
          ...prev.pricing,
          is_split: true,
          trechos: newTrechos,
          total_nipon,
          total_cost,
        },
      };
    });
  };

  const setPricing = (patch) =>
    setFormData((p) => ({ ...p, pricing: { ...p.pricing, ...patch } }));

  // Blocos extras de tipo de emissão (vários tipos de tarifa somados).
  const addExtraBlock = () =>
    setFormData((p) => ({
      ...p,
      pricing: {
        ...p.pricing,
        extra_blocks: [...(p.pricing.extra_blocks || []), { ...EMPTY_EMISSION_BLOCK }],
      },
    }));
  const updateExtraBlock = (idx, patch) =>
    setFormData((p) => {
      const arr = [...(p.pricing.extra_blocks || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...p, pricing: { ...p.pricing, extra_blocks: arr } };
    });
  const removeExtraBlock = (idx) =>
    setFormData((p) => {
      const arr = [...(p.pricing.extra_blocks || [])];
      arr.splice(idx, 1);
      return { ...p, pricing: { ...p.pricing, extra_blocks: arr } };
    });

  const selectedProgram = useMemo(
    () => milesTable.find((m) => m.id === formData.pricing.program_id) || null,
    [milesTable, formData.pricing.program_id]
  );

  const appliedTier = useMemo(
    () => (selectedProgram ? getTierForMiles(selectedProgram, parseBR(formData.pricing.miles_qty)) : null),
    [selectedProgram, formData.pricing.miles_qty]
  );

  const milesQtyParsed = useMemo(
    () => parseBR(formData.pricing.miles_qty),
    [formData.pricing.miles_qty]
  );

  const appliedCostPerThousand = useMemo(() => {
    if (!selectedProgram) return Number(formData.pricing.miles_value_per_thousand) || 0;
    return getCostForMiles(selectedProgram, milesQtyParsed);
  }, [selectedProgram, milesQtyParsed, formData.pricing.miles_value_per_thousand]);

  const appliedSalePerThousand = useMemo(() => {
    if (!selectedProgram) return Number(formData.pricing.miles_value_per_thousand) || 0;
    return getSaleForMiles(selectedProgram, milesQtyParsed);
  }, [selectedProgram, milesQtyParsed, formData.pricing.miles_value_per_thousand]);

  // Cálculos — campos preenchidos pelo vendedor representam 1 emissão (1 pax).
  // Nipon e custo "por pessoa" são multiplicados por formData.passengers nos totais.
  const calc = useMemo(() => {
    const pr = formData.pricing;
    let cost_brl = 0;       // custo real interno por pessoa (sem taxa)
    let venda_base = 0;     // valor de venda das milhas por pessoa (sale_per_thousand)
    let niponPorPessoa = 0;
    let acrescimo = 0;
    let custoPorPessoa = 0;

    if (pr.multi_program) {
      // Multi-programa — cada trecho com programa próprio. Custo e Nipon são
      // somas dos trechos (POR PESSOA). venda_base = soma da "venda das milhas"
      // de cada trecho usando sale_per_thousand do programa.
      const arr = Array.isArray(pr.trechos_pricing) ? pr.trechos_pricing : [];
      for (const tp of arr) {
        const milhas = parseBR(tp.miles_qty);
        const tax = parseBR(tp.tax);
        const cpt = Number(tp.cost_per_thousand) || 0;
        const spt = Number(tp.sale_per_thousand) || 0;
        const milhasCost = (milhas / 1000) * cpt;
        const milhasSale = (milhas / 1000) * spt;
        const segCost = milhasCost + tax;
        const segNipon = tp.is_azul ? segCost : milhasSale + tax;
        cost_brl += milhasCost;
        venda_base += milhasSale;
        custoPorPessoa += segCost;
        niponPorPessoa += segNipon;
      }
    } else if (pr.is_split) {
      // Em modo split, total_nipon/total_cost já são a soma POR PESSOA dos trechos.
      niponPorPessoa = Number(pr.total_nipon) || 0;
      custoPorPessoa = Number(pr.total_cost) || 0;
      cost_brl = custoPorPessoa;
    } else {
      const tax = parseBR(pr.tax);
      if (pr.type === "milhas") {
        const milhas = parseBR(pr.miles_qty);
        cost_brl = (milhas / 1000) * appliedCostPerThousand;
        venda_base = (milhas / 1000) * appliedSalePerThousand;
        niponPorPessoa = venda_base + tax;
      } else if (pr.type === "milhas_dinheiro") {
        // Tarifa híbrida Azul — custo = milhas + parte em dinheiro; Nipon +10%
        // sempre (mesmo Azul). cost_per_thousand vem fixo do programa selecionado.
        const milhas = parseBR(pr.miles_qty);
        const dinheiro = parseBR(pr.cash_part);
        const cpt = Number(pr.cost_per_thousand) || appliedCostPerThousand;
        cost_brl = (milhas / 1000) * cpt + dinheiro;
        niponPorPessoa = (cost_brl + tax) * 1.10;
      } else if (pr.type === "consolidadora") {
        // Custo efetivo = Tarifa + Taxa de embarque − DU (taxa já embutida no
        // custo, por isso custoPorPessoa = cost_brl + 0). Nipon sempre × 1.10.
        const fare = parseBR(pr.fare_total);
        const boarding = parseBR(pr.boarding_tax);
        const du = parseBR(pr.du_value);
        cost_brl = fare + boarding - du;
        niponPorPessoa = cost_brl * 1.10;
      } else {
        const cost = parseBR(pr.cost_brl);
        const base = cost + tax;
        acrescimo = pr.is_azul ? 0 : base * 0.10;
        niponPorPessoa = base + acrescimo;
        cost_brl = cost;
      }
      custoPorPessoa = cost_brl + tax;
    }

    const passengers = Math.max(1, Number(formData.passengers) || 1);
    // cost_is_total: o valor digitado no bloco já é o total de todos os
    // passageiros (ex.: Smiles cobra a tarifa cheia) → não multiplica por pax.
    const mainMult = pr.cost_is_total === true ? 1 : passengers;
    let niponTotal = niponPorPessoa * mainMult;
    let custoTotal = custoPorPessoa * mainMult;
    // Blocos extras de tipo de emissão — somados ao principal.
    for (const b of (Array.isArray(pr.extra_blocks) ? pr.extra_blocks : [])) {
      const cn = emissionBlockCN(b);
      const m = b.cost_is_total === true ? 1 : passengers;
      custoTotal += cn.cost * m;
      niponTotal += cn.nipon * m;
    }

    const saleInput = parseBR(pr.sale_value);
    const isPerPerson = pr.sale_per !== "total";
    const saleTotal = isPerPerson ? saleInput * passengers : saleInput;

    // Comissão sempre sobre os totais. Taxa base depende da origem do lead:
    // Carteira própria → 30%; demais → 25%. Extra fixo em 45% do excedente.
    const leadOrigin = formData.client?.lead_origin || "";
    const isCarteiraPropria = String(leadOrigin)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .startsWith("carteira propria");
    const baseRate = isCarteiraPropria ? 0.3 : 0.25;
    const lucroNipon = Math.max(0, niponTotal - custoTotal);
    const comissaoBase = lucroNipon * baseRate;
    const excedente = Math.max(0, saleTotal - niponTotal);
    const comissaoExtra = excedente * 0.45;
    const comissaoTotal = comissaoBase + comissaoExtra;
    const lucroBruto = saleTotal - custoTotal;

    const total =
      saleTotal +
      (formData.additional.active ? parseBR(formData.additional.value) : 0) +
      (formData.services.insurance.active ? parseBR(formData.services.insurance.value) : 0) +
      (formData.services.transfer.active ? parseBR(formData.services.transfer.value) : 0);

    return {
      cost_brl, venda_base, acrescimo,
      // Mantemos nomes antigos apontando aos totais para compatibilidade da UI:
      nipon: niponTotal,
      niponPorPessoa,
      custoTotal,
      custoPorPessoa,
      saleInput, saleTotal, isPerPerson, passengers,
      lucroNipon, lucroBruto,
      comissaoBase, excedente, comissaoExtra, comissaoTotal,
      baseRate, isCarteiraPropria,
      total,
    };
  }, [formData, appliedCostPerThousand, appliedSalePerThousand]);

  // Mantém nipon_value (POR PESSOA) e cost_brl_calc sincronizados (single + multi).
  // Modo split não sincroniza (já tem total_nipon/total_cost próprios).
  useEffect(() => {
    if (formData.pricing.is_split) return;
    setFormData((p) => ({
      ...p,
      pricing: { ...p.pricing, nipon_value: calc.niponPorPessoa, cost_brl_calc: calc.cost_brl },
    }));

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionalmente estreitas (efeito de sync); incluir as faltantes mudaria comportamento
  }, [calc.niponPorPessoa, calc.cost_brl, formData.pricing.is_split]);

  // Preço sugerido pela tabela (venda das milhas + taxas) × pax. Usado para
  // detectar override do vendedor (cobrar diferente do que a tabela sugere).
  const precoSugerido = useMemo(() => {
    const pr = formData.pricing;
    const pax = Math.max(1, Number(formData.passengers) || 1);
    if (pr.multi_program) {
      let perPax = 0;
      for (const tp of pr.trechos_pricing || []) {
        const milhas = parseBR(tp.miles_qty);
        const tax = parseBR(tp.tax);
        const spt = Number(tp.sale_per_thousand) || 0;
        perPax += (milhas / 1000) * spt + tax;
      }
      return perPax * pax;
    }
    if (pr.is_split || pr.type !== "milhas") return 0;
    // Single programa milhas: usa sale_per_thousand do programa selecionado
    const milhas = parseBR(pr.miles_qty);
    const tax = parseBR(pr.tax);
    return ((milhas / 1000) * appliedSalePerThousand + tax) * pax;
  }, [formData.pricing, formData.passengers, appliedSalePerThousand]);

  const saleAtual = useMemo(() => {
    const pr = formData.pricing;
    const pax = Math.max(1, Number(formData.passengers) || 1);
    const v = parseBR(pr.sale_value);
    return pr.sale_per === "pessoa" ? v * pax : v;
  }, [formData.pricing, formData.passengers]);

  const isPriceOverridden =
    precoSugerido > 0 && saleAtual > 0 && Math.abs(saleAtual - precoSugerido) > 5;

  // Persiste flag de override no pricing (lido por persistQuote pra criar notificação)
  useEffect(() => {
    setFormData((p) => {
      const same =
        p.pricing?.price_overridden === isPriceOverridden &&
        Math.abs((Number(p.pricing?.suggested_price) || 0) - precoSugerido) < 0.01;
      if (same) return p;
      return {
        ...p,
        pricing: {
          ...p.pricing,
          price_overridden: isPriceOverridden,
          suggested_price: precoSugerido,
        },
      };
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionalmente estreitas (efeito de sync); incluir as faltantes mudaria comportamento
  }, [isPriceOverridden, precoSugerido]);

  const aboveNipon = calc.saleTotal >= calc.nipon && calc.saleTotal > 0;
  const passengers = calc.passengers;

  // Nipon TOTAL — usado pelo card de valor livre do parceiro e como
  // referência informativa nos snapshots de partner_rav/partner_desconto.
  const niponTotal = calc.nipon;

  // Snapshot informativo persistido: RAV/desconto derivados automaticamente
  // do sale_value vs Nipon. Sem modo: tudo deriva direto do input.
  useEffect(() => {
    if (!isParceiroMode) return;
    const venda = parseBR(formData.pricing.sale_value) || 0;
    const diff = venda - niponTotal;
    const rav = diff > 0 ? diff : 0;
    const desc = diff < 0 ? Math.abs(diff) : 0;
    setFormData((prev) => {
      const p = prev.pricing || {};
      const same =
        Math.abs((Number(p.partner_rav) || 0) - rav) < 0.01 &&
        Math.abs((Number(p.partner_desconto) || 0) - desc) < 0.01;
      if (same) return prev;
      return {
        ...prev,
        pricing: { ...p, partner_rav: rav, partner_desconto: desc },
      };
    });
  }, [isParceiroMode, formData.pricing.sale_value, niponTotal, setFormData]);

  return (
    <div className="space-y-6">
      {/* 4-Moeda — toggle BRL/EUR + badge de cotação ao vivo */}
      <Card className={cn("border-border/50", isEur && "border-accent/30 bg-accent/10")}>
        <CardContent className="p-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Moeda da operação</Label>
            <div className="flex gap-1 bg-bg-elevated rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setCurrency("BRL")}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium transition",
                  currency === "BRL"
                    ? "bg-bg-surface shadow text-text-primary"
                    : "text-text-secondary hover:bg-bg-surface"
                )}
              >
                🇧🇷 Real (BRL)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("EUR")}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium transition",
                  currency === "EUR"
                    ? "bg-bg-surface shadow text-text-primary"
                    : "text-text-secondary hover:bg-bg-surface"
                )}
              >
                🇪🇺 Euro (EUR)
              </button>
            </div>
          </div>
          {isEur && <ExchangeRateBadge compact />}
        </CardContent>
        {isEur && !eurRate && (
          <CardContent className="pt-0 pb-3">
            <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded p-2">
              ⚠️ Cotação indisponível no momento. Aguarde alguns segundos ou volte para BRL.
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4A - Tipo de emissão */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Tipo de Emissão
            {isSplit && (
              <Badge variant="secondary" className="text-[10px]">Múltiplas emissões</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
        {/* Toggle multi-programa — só fora de Quebra de Trecho e com 2+ trechos */}
        {canMultiProgram && (
          <div className="flex items-start justify-between gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg mb-4">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-warning">
                Programas diferentes por trecho?
              </p>
              <p className="text-xs text-warning mt-0.5">
                Ative quando IDA e VOLTA usam companhias/programas diferentes (ex: ida GOL, volta LATAM).
              </p>
            </div>
            <Switch
              checked={isMultiProgram}
              onCheckedChange={(checked) => {
                setFormData((prev) => {
                  const next = { ...prev.pricing, multi_program: !!checked };
                  if (!checked) {
                    delete next.trechos_pricing;
                  }
                  return { ...prev, pricing: next };
                });
              }}
            />
          </div>
        )}

        {isSplit ? (
          <SplitPricing
            trechos={formData.pricing?.trechos || []}
            milesTable={milesTable}
            onChange={updateTrechoPricing}
            passengers={passengers}
          />
        ) : isMultiProgram ? (
          <MultiProgramPricing
            trechosPricing={formData.pricing?.trechos_pricing || []}
            milesTable={milesTable}
            onChange={updateMultiTrechoPricing}
            passengers={passengers}
            custoPorPessoa={calc.custoPorPessoa}
            niponPorPessoa={calc.niponPorPessoa}
            custoTotal={calc.custoTotal}
            niponTotal={calc.nipon}
          />
        ) : (
          <>
          <Tabs
            value={formData.pricing.type}
            onValueChange={(v) => setPricing({ type: v })}
          >
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full max-w-2xl h-auto">
              <TabsTrigger value="milhas">Milhas</TabsTrigger>
              <TabsTrigger value="milhas_dinheiro">Milhas + Dinheiro</TabsTrigger>
              <TabsTrigger value="dinheiro">Dinheiro</TabsTrigger>
              <TabsTrigger value="consolidadora">Consolidadora</TabsTrigger>
            </TabsList>

            <TabsContent value="milhas" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Programa de Milhas</Label>
                  <Select
                    value={formData.pricing.program_id}
                    onValueChange={(v) => {
                      const program = milesTable.find((m) => m.id === v);
                      setPricing({
                        program_id: v,
                        program_name: program?.program || "",
                        miles_value_per_thousand: program?.cost_per_thousand || 0,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={milesTable.length === 0 ? "Sem programas cadastrados" : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {milesTable.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          disabled={m.stock_status === "unavailable"}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full",
                                m.stock_status === "own" && "bg-success",
                                m.stock_status === "unavailable" && "bg-danger",
                                (!m.stock_status || m.stock_status === "supplier") && "bg-warning"
                              )}
                            />
                            {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                            {m.stock_status === "unavailable" && (
                              <span className="text-danger text-xs">(em falta)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Custo em milhas</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 80.000 ou 80000"
                    value={formData.pricing.miles_qty}
                    onChange={(e) => setPricing({ miles_qty: sanitizeBRInput(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isEur ? "Taxa de embarque (EUR)" : "Taxa de embarque (R$)"}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={isEur ? "Ex: 50,00" : "Ex: 320,50"}
                    value={isEur ? (formData.pricing.tax_eur ?? "") : formData.pricing.tax}
                    onChange={(e) => {
                      if (isEur) {
                        setEurField("tax_eur", "tax", sanitizeBRInput(e.target.value));
                      } else {
                        setPricing({ tax: sanitizeBRInput(e.target.value) });
                      }
                    }}
                  />
                  {isEur && eurRate > 0 && Number(formData.pricing.tax_eur) > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      ≈ {formatBRL(convertEurToBrl(formData.pricing.tax_eur, eurRate))}
                    </p>
                  )}
                </div>
              </div>
              <Card className="bg-muted/40 border-border/50">
                <CardContent className="p-4 space-y-1.5 text-sm">
                  {appliedTier && (
                    <div className="flex items-center justify-between p-2 mb-1 rounded-lg bg-accent/10 border border-accent/30">
                      <span className="text-xs font-semibold text-accent dark:text-accent flex items-center gap-1.5">
                        Faixa aplicada: {appliedTier.label}
                      </span>
                      <span className="text-xs text-accent dark:text-accent">
                        base venda: {formatBRL(selectedProgram?.sale_per_thousand)}/mil
                      </span>
                    </div>
                  )}
                  <Row label="Venda do milheiro" value={formatBRL(appliedSalePerThousand)} />
                  <Row label="Custo real (interno)" value={formatBRL(appliedCostPerThousand)} muted />
                  <Row label={`Valor das milhas (venda${passengers >= 2 ? " · por pessoa" : ""})`} value={formatBRL(calc.venda_base)} />
                  <Row label={`Taxa de embarque${passengers >= 2 ? " · por pessoa" : ""}`} value={formatBRL(parseBR(formData.pricing.tax))} />
                  <Separator className="my-2" />
                  <Row label={`VALOR NIPON${passengers >= 2 ? " (por pessoa)" : " (venda mínima)"}`} value={formatBRL(calc.niponPorPessoa)} bold accent />
                  <Row
                    label={`Custo real total${passengers >= 2 ? " · por pessoa" : ""}`}
                    value={formatBRL(calc.custoPorPessoa)}
                    muted
                  />
                  <Row
                    label={`Margem bruta${passengers >= 2 ? " · por pessoa" : ""}`}
                    value={formatBRL(calc.niponPorPessoa - calc.custoPorPessoa)}
                    bold
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="milhas_dinheiro" className="space-y-4 mt-4">
              {/* Aviso explicativo */}
              <div className="bg-warning-subtle border border-warning/30 rounded-lg p-3">
                <p className="font-semibold text-sm text-warning">Tarifa híbrida</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Disponível apenas para programas Azul (Azul Pelo Mundo, Voe Azul) — a passagem
                  cobra simultaneamente milhas e um valor em reais.
                </p>
              </div>

              {/* Programa de milhas — APENAS Azul */}
              <div className="space-y-2">
                <Label>Programa de milhas (Azul)</Label>
                <Select
                  value={formData.pricing.program_id}
                  onValueChange={(v) => {
                    const program = milesTable.find((m) => m.id === v);
                    setPricing({
                      program_id: v,
                      program_name: program?.program || "",
                      cost_per_thousand: Number(program?.cost_per_thousand) || 0,
                      sale_per_thousand: Number(program?.sale_per_thousand) || 0,
                      is_azul: true,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione programa Azul..." />
                  </SelectTrigger>
                  <SelectContent>
                    {milesTable
                      .filter((m) => m.program?.toLowerCase().includes("azul"))
                      .map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          disabled={m.stock_status === "unavailable"}
                        >
                          {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {milesTable.filter((m) => m.program?.toLowerCase().includes("azul")).length === 0 && (
                  <p className="text-xs text-danger mt-1">
                    Nenhum programa Azul cadastrado. Adicione em /gerente/milhas.
                  </p>
                )}
              </div>

              {/* Inputs lado a lado: milhas + dinheiro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Milhas necessárias (por pax)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 20.000 ou 20000"
                    value={formData.pricing.miles_qty}
                    onChange={(e) => setPricing({ miles_qty: sanitizeBRInput(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor em dinheiro (R$, por pax)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 2.500,00"
                    value={formData.pricing.cash_part ?? ""}
                    onChange={(e) => setPricing({ cash_part: sanitizeBRInput(e.target.value) })}
                  />
                </div>
              </div>

              {/* Taxa de embarque */}
              <div className="space-y-2">
                <Label>Taxa de embarque (R$, por pax)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 64,60"
                  value={formData.pricing.tax}
                  onChange={(e) => setPricing({ tax: sanitizeBRInput(e.target.value) })}
                />
              </div>

              {/* Resumo do cálculo */}
              {milesQtyParsed > 0 && (
                <Card className="bg-muted/40 border-border/50">
                  <CardContent className="p-4 space-y-1.5 text-sm">
                    {(() => {
                      const milhas = parseBR(formData.pricing.miles_qty);
                      const dinheiro = parseBR(formData.pricing.cash_part);
                      const taxa = parseBR(formData.pricing.tax);
                      const cpt = Number(formData.pricing.cost_per_thousand) || 0;
                      const custoMilhas = (milhas / 1000) * cpt;
                      const custoTotal = custoMilhas + dinheiro + taxa;
                      const niponPerPax = custoTotal * 1.1;
                      const niponTotal = niponPerPax * passengers;
                      const custoConsolidado = custoTotal * passengers;
                      return (
                        <>
                          <Row
                            label="Custo das milhas"
                            value={`${milhas.toLocaleString("pt-BR")} × ${formatBRL(cpt)}/mil = ${formatBRL(custoMilhas)}`}
                          />
                          <Row label="Parte em dinheiro" value={formatBRL(dinheiro)} />
                          <Row label={`Taxa de embarque${passengers >= 2 ? " · por pessoa" : ""}`} value={formatBRL(taxa)} />
                          <Separator className="my-2" />
                          <Row
                            label={`Custo total${passengers >= 2 ? " · por pessoa" : ""}`}
                            value={formatBRL(custoTotal)}
                            muted
                          />
                          <Row
                            label={`VALOR NIPON (custo × 1.10)${passengers >= 2 ? " · por pessoa" : " · venda mínima"}`}
                            value={formatBRL(niponPerPax)}
                            bold
                            accent
                          />
                          {passengers >= 2 && (
                            <>
                              <Separator className="my-2" />
                              <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                                Totais ({passengers} passageiros)
                              </p>
                              <Row label="Custo total" value={formatBRL(custoConsolidado)} muted />
                              <Row label="Nipon total sugerido" value={formatBRL(niponTotal)} bold accent />
                            </>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="dinheiro" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{isEur ? "Preço de custo (EUR)" : "Preço de custo (R$)"}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={isEur ? "Ex: 200,00" : "Ex: 1.234,56"}
                    value={isEur ? (formData.pricing.cost_eur ?? "") : formData.pricing.cost_brl}
                    onChange={(e) => {
                      if (isEur) {
                        setEurField("cost_eur", "cost_brl", sanitizeBRInput(e.target.value));
                      } else {
                        setPricing({ cost_brl: sanitizeBRInput(e.target.value) });
                      }
                    }}
                  />
                  {isEur && eurRate > 0 && Number(formData.pricing.cost_eur) > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      ≈ {formatBRL(convertEurToBrl(formData.pricing.cost_eur, eurRate))} (cotação R$ {eurRate.toFixed(4)})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{isEur ? "Taxa de embarque (EUR)" : "Taxa de embarque (R$)"}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={isEur ? "Ex: 50,00" : "Ex: 320,50"}
                    value={isEur ? (formData.pricing.tax_eur ?? "") : formData.pricing.tax}
                    onChange={(e) => {
                      if (isEur) {
                        setEurField("tax_eur", "tax", sanitizeBRInput(e.target.value));
                      } else {
                        setPricing({ tax: sanitizeBRInput(e.target.value) });
                      }
                    }}
                  />
                  {isEur && eurRate > 0 && Number(formData.pricing.tax_eur) > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      ≈ {formatBRL(convertEurToBrl(formData.pricing.tax_eur, eurRate))}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="azul"
                  checked={formData.pricing.is_azul}
                  onCheckedChange={(c) => setPricing({ is_azul: !!c })}
                />
                <Label htmlFor="azul" className="text-sm cursor-pointer">
                  Azul — não aplicar 10%
                </Label>
              </div>
              <Card className="bg-muted/40 border-border/50">
                <CardContent className="p-4 space-y-1.5 text-sm">
                  <Row label={`Custo base${passengers >= 2 ? " · por pessoa" : ""}`} value={formatBRL(parseBR(formData.pricing.cost_brl))} />
                  <Row label={`Taxa de embarque${passengers >= 2 ? " · por pessoa" : ""}`} value={formatBRL(parseBR(formData.pricing.tax))} />
                  <Row
                    label="Acréscimo 10%"
                    value={formData.pricing.is_azul ? "Isento — Azul" : formatBRL(calc.acrescimo)}
                  />
                  <Separator className="my-2" />
                  <Row label={`VALOR NIPON${passengers >= 2 ? " (por pessoa)" : " (venda mínima)"}`} value={formatBRL(calc.niponPorPessoa)} bold accent />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="consolidadora" className="space-y-4 mt-4">
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                <p className="font-semibold text-sm text-accent">Tarifa de consolidadora</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Custo = Tarifa + Taxa de embarque − DU. O DU (comissão da consolidadora)
                  abate o custo. Nipon = custo × 1,10. O RAV é só a base da venda sugerida.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tarifa total (R$)</Label>
                  <Input type="text" inputMode="decimal" placeholder="Ex: 5.000,00"
                    value={formData.pricing.fare_total ?? ""}
                    onChange={(e) => setPricing({ fare_total: sanitizeBRInput(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Taxa de embarque (R$)</Label>
                  <Input type="text" inputMode="decimal" placeholder="Ex: 300,00"
                    value={formData.pricing.boarding_tax ?? ""}
                    onChange={(e) => setPricing({ boarding_tax: sanitizeBRInput(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>DU — comissão da consolidadora (R$)</Label>
                  <Input type="text" inputMode="decimal" placeholder="Ex: 200,00"
                    value={formData.pricing.du_value ?? ""}
                    onChange={(e) => setPricing({ du_value: sanitizeBRInput(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>RAV — acréscimo da agência (R$, opcional)</Label>
                  <Input type="text" inputMode="decimal" placeholder="Ex: 400,00"
                    value={formData.pricing.rav_value ?? ""}
                    onChange={(e) => setPricing({ rav_value: sanitizeBRInput(e.target.value) })} />
                </div>
              </div>
              {(parseBR(formData.pricing.fare_total) > 0 || parseBR(formData.pricing.boarding_tax) > 0) && (() => {
                const fare = parseBR(formData.pricing.fare_total);
                const boarding = parseBR(formData.pricing.boarding_tax);
                const du = parseBR(formData.pricing.du_value);
                const rav = parseBR(formData.pricing.rav_value);
                const custoEfetivo = fare + boarding - du;
                const nipon = custoEfetivo * 1.10;
                const vendaSugerida = fare + boarding + rav;
                return (
                  <Card className="bg-muted/40 border-border/50">
                    <CardContent className="p-4 space-y-1.5 text-sm">
                      <Row label="Tarifa + Taxa de embarque" value={formatBRL(fare + boarding)} />
                      <Row label="DU (abate do custo)" value={`− ${formatBRL(du)}`} muted />
                      <Separator className="my-2" />
                      <Row label={`Custo efetivo${passengers >= 2 ? " · por pessoa" : ""}`} value={formatBRL(custoEfetivo)} muted />
                      <Row label={`VALOR NIPON${passengers >= 2 ? " (por pessoa)" : " (venda mínima)"}`} value={formatBRL(nipon)} bold accent />
                      <Separator className="my-2" />
                      <Row label="Venda sugerida (Tarifa + Taxa + RAV)" value={formatBRL(vendaSugerida)} bold />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1 w-full"
                        onClick={() => setPricing({ sale_value: String(vendaSugerida), sale_per: "total" })}
                      >
                        Usar {formatBRL(vendaSugerida)} como valor de venda
                      </Button>
                    </CardContent>
                  </Card>
                );
              })()}
            </TabsContent>
          </Tabs>

          {/* Custo já é o total de todos os passageiros? (ex.: Smiles) */}
          {passengers >= 2 && (
            <div className="flex items-start gap-2 mt-4">
              <Checkbox
                id="cost_is_total"
                checked={formData.pricing.cost_is_total === true}
                onCheckedChange={(c) => setPricing({ cost_is_total: !!c })}
                className="mt-0.5"
              />
              <Label htmlFor="cost_is_total" className="text-sm cursor-pointer leading-snug font-medium">
                O custo informado já é o total de todos os passageiros
                <span className="block text-xs text-text-muted font-normal mt-0.5">
                  Marque quando a companhia (ex.: Smiles) cobra a tarifa cheia para todos juntos —
                  o sistema não multiplica por {passengers} passageiros.
                </span>
              </Label>
            </div>
          )}

          {/* Blocos extras — quando o voo é quebrado em mais de um tipo de tarifa */}
          {(formData.pricing.extra_blocks || []).map((b, idx) => (
            <EmissionBlockEditor
              key={idx}
              block={b}
              index={idx}
              milesTable={milesTable}
              passengers={passengers}
              onChange={(patch) => updateExtraBlock(idx, patch)}
              onRemove={() => removeExtraBlock(idx)}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={addExtraBlock}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar tipo de emissão
          </Button>

          {/* Resumo consolidado — soma do principal + extras */}
          {((formData.pricing.extra_blocks || []).length > 0 ||
            formData.pricing.cost_is_total === true) && (
            <Card className="bg-bg-elevated border-border mt-4">
              <CardContent className="p-4 space-y-1.5 text-sm">
                <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1">
                  Resumo consolidado
                  {(formData.pricing.extra_blocks || []).length > 0
                    ? ` · ${(formData.pricing.extra_blocks || []).length + 1} tipos de tarifa`
                    : ""}
                </p>
                <Row label="Custo total" value={formatBRL(calc.custoTotal)} muted />
                <Row label="Nipon total (venda mínima)" value={formatBRL(calc.nipon)} bold accent />
                <Row label="Margem bruta (vs venda atual)" value={formatBRL(calc.lucroBruto)} bold />
              </CardContent>
            </Card>
          )}
          </>
        )}
        </CardContent>
      </Card>

      {/* 4B - Valor de venda à parceira (input livre + feedback contextual) */}
      {isParceiroMode && (
        <Card className="border-warning/30 bg-warning/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-warning" />
              Valor da passagem para a parceira
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Você define livremente. Nipon é apenas referência sugerida.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Sugestão informativa: custo + Nipon como referência */}
            <div className="bg-bg-surface border border-border rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo total da PCD:</span>
                <strong className="text-text-secondary">{formatBRL(calc.custoTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nipon (sugestão de venda):</span>
                <strong className="text-warning">{formatBRL(niponTotal)}</strong>
              </div>
            </div>

            {/* Input de valor livre */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {isEur
                  ? "Valor que vou cobrar da parceira (EUR, total)"
                  : "Valor que vou cobrar da parceira (total)"}
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={
                  isEur
                    ? (eurRate > 0
                        ? `Sugerido: ${formatEUR(convertBrlToEur(niponTotal, eurRate))}`
                        : "0,00")
                    : `Sugerido: ${formatBRL(niponTotal)}`
                }
                value={isEur ? (formData.pricing.sale_value_eur ?? "") : formData.pricing.sale_value}
                onChange={(e) => {
                  if (isEur) {
                    const eur = parseFloat(String(sanitizeBRInput(e.target.value)).replace(",", ".")) || 0;
                    const brl = eurRate > 0 ? eur * eurRate : 0;
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        sale_value_eur: eur,
                        sale_value: brl,
                        sale_per: "total",
                      },
                    }));
                  } else {
                    setPricing({
                      sale_value: sanitizeBRInput(e.target.value),
                      sale_per: "total",
                    });
                  }
                }}
                className="text-lg font-semibold h-12"
              />
              {isEur && eurRate > 0 && Number(formData.pricing.sale_value_eur) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  ≈ {formatBRL(parseBR(formData.pricing.sale_value))} (cotação R$ {eurRate.toFixed(4)})
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isEur && eurRate > 0) {
                    const eur = convertBrlToEur(niponTotal, eurRate);
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        sale_value_eur: eur,
                        sale_value: niponTotal,
                        sale_per: "total",
                      },
                    }));
                  } else {
                    setPricing({ sale_value: String(niponTotal), sale_per: "total" });
                  }
                }}
                className="text-xs text-warning hover:text-warning underline"
              >
                Usar valor sugerido (Nipon)
              </button>
            </div>

            {/* Feedback contextual: prejuízo / margem comprimida / lucro saudável */}
            {(() => {
              const venda = parseBR(formData.pricing.sale_value) || 0;
              if (venda === 0) return null;

              const lucroBruto = venda - calc.custoTotal;
              const acimaNipon = venda - niponTotal;

              // CASO 1: prejuízo — venda abaixo do custo
              if (venda < calc.custoTotal) {
                const prejuizo = calc.custoTotal - venda;
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
                          Custo PCD: {formatBRL(calc.custoTotal)} · Sua venda: {formatBRL(venda)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // CASO 2: entre custo e Nipon — margem comprimida
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
                          Custo: {formatBRL(calc.custoTotal)} → Venda: {formatBRL(venda)} ({((lucroBruto / venda) * 100).toFixed(1)}% margem)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // CASO 3: acima do Nipon — operação saudável
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
                        Custo: {formatBRL(calc.custoTotal)} → Venda: {formatBRL(venda)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* 4B - Valor de venda */}
      {!isParceiroMode && (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Valor de Venda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {passengers >= 2 && (
            <Card className="bg-accent/5 border-accent/30">
              <CardContent className="p-3 space-y-1.5 text-sm">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Resumo por passageiro × {passengers} pax
                </div>
                <Row label="Custo por pessoa" value={formatBRL(calc.custoPorPessoa)} muted />
                <Row label="Nipon por pessoa" value={formatBRL(calc.niponPorPessoa)} />
                <Separator className="my-2" />
                <Row label="Custo total" value={formatBRL(calc.custoTotal)} muted />
                <Row label="VALOR NIPON TOTAL" value={formatBRL(calc.nipon)} bold accent />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] items-end">
            <div className="space-y-2">
              <Label>
                {isEur
                  ? "Valor de venda ao cliente (EUR) *"
                  : "Valor de venda ao cliente (R$) *"}
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={isEur ? "Ex: 250,00" : "Ex: 1.234,56"}
                value={isEur ? (formData.pricing.sale_value_eur ?? "") : formData.pricing.sale_value}
                onChange={(e) => {
                  if (isEur) {
                    const eur = parseFloat(String(sanitizeBRInput(e.target.value)).replace(",", ".")) || 0;
                    const brl = eurRate > 0 ? eur * eurRate : 0;
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        sale_value_eur: eur,
                        sale_value: brl,
                      },
                    }));
                  } else {
                    setPricing({ sale_value: sanitizeBRInput(e.target.value) });
                  }
                }}
              />
              {isEur && eurRate > 0 && Number(formData.pricing.sale_value_eur) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  ≈ {formatBRL(parseBR(formData.pricing.sale_value))} (cotação R$ {eurRate.toFixed(4)})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Cobrado por</Label>
              <Select
                value={formData.pricing.sale_per || "pessoa"}
                onValueChange={(v) => setPricing({ sale_per: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoa">Por pessoa</SelectItem>
                  <SelectItem value="total">Total da viagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {passengers >= 2 && calc.saleInput > 0 && (
            <div className="text-xs text-muted-foreground">
              {calc.isPerPerson
                ? <>Total da venda: <strong>{formatBRL(calc.saleTotal)}</strong> ({formatBRL(calc.saleInput)} × {passengers} pax)</>
                : <>Por pessoa: <strong>{formatBRL(calc.saleTotal / passengers)}</strong> ({formatBRL(calc.saleTotal)} ÷ {passengers})</>}
            </div>
          )}

          {/* Override de preço — preço cobrado difere do sugerido pela tabela */}
          {isPriceOverridden && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-accent">
                    Preço customizado pelo vendedor
                  </p>
                  <p className="text-xs text-accent mt-0.5">
                    Sugerido pela tabela: <strong>{formatBRL(precoSugerido)}</strong> · Você está cobrando:{" "}
                    <strong>{formatBRL(saleAtual)}</strong>
                    {saleAtual > precoSugerido && (
                      <span className="text-success"> (acima do sugerido — bom!)</span>
                    )}
                    {saleAtual < precoSugerido && (
                      <span className="text-warning"> (abaixo do sugerido)</span>
                    )}
                  </p>
                  <p className="text-[10px] text-accent mt-1">
                    ⓘ O gerente será notificado sobre essa alteração ao salvar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {calc.saleTotal > 0 && !aboveNipon && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <span className="text-warning dark:text-warning">
                Valor de venda total ({formatBRL(calc.saleTotal)}) está abaixo do Nipon total ({formatBRL(calc.nipon)}).
                Sem comissão extra — comissão base calculada sobre o lucro mínimo do Nipon.
              </span>
            </div>
          )}
          {calc.saleTotal > 0 && (
            <Card className={cn(
              aboveNipon
                ? "bg-success/5 border-success/30"
                : "bg-muted/40 border-border/60"
            )}>
              <CardContent className="p-4 space-y-1.5 text-sm">
                <Row label="Lucro Nipon (nipon − custo)" value={formatBRL(calc.lucroNipon)} />
                <Row
                  label={`Comissão base (${(calc.baseRate * 100).toFixed(0)}% do lucro Nipon)${calc.isCarteiraPropria ? " · Carteira própria" : ""}`}
                  value={formatBRL(calc.comissaoBase)}
                />
                <Row label="Excedente sobre Nipon" value={formatBRL(calc.excedente)} />
                <Row label="Comissão extra (45% do excedente)" value={formatBRL(calc.comissaoExtra)} />
                <Separator className="my-2" />
                <Row
                  label="COMISSÃO TOTAL DO VENDEDOR"
                  value={formatBRL(calc.comissaoTotal)}
                  bold
                  className={aboveNipon ? "text-success" : "text-foreground"}
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      )}

      {/* 4C - Valor adicional */}
      {!isParceiroMode && (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="add-active"
              checked={formData.additional.active}
              onCheckedChange={(c) =>
                setFormData((p) => ({ ...p, additional: { ...p.additional, active: !!c } }))
              }
            />
            <Label htmlFor="add-active" className="text-sm cursor-pointer">
              Adicionar valor extra ao orçamento
            </Label>
          </div>
        </CardHeader>
        {formData.additional.active && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 1.234,56"
                  value={formData.additional.value}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, additional: { ...p.additional, value: sanitizeBRInput(e.target.value) } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Ex: Serviço VIP"
                  value={formData.additional.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, additional: { ...p.additional, description: e.target.value } }))
                  }
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      )}

      {/* 4D - Concorrência */}
      <Card className="border-border/50 border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="comp-active"
              checked={formData.competitor.active}
              onCheckedChange={(c) =>
                setFormData((p) => ({ ...p, competitor: { ...p.competitor, active: !!c } }))
              }
            />
            <Label htmlFor="comp-active" className="text-sm cursor-pointer">
              Registrar preço concorrente
            </Label>
          </div>
        </CardHeader>
        {formData.competitor.active && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Empresa concorrente</Label>
                <Input
                  value={formData.competitor.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, competitor: { ...p.competitor, name: e.target.value } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 1.234,56"
                  value={formData.competitor.value}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, competitor: { ...p.competitor, value: sanitizeBRInput(e.target.value) } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de tarifa</Label>
                <Select
                  value={formData.competitor.fare_type}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, competitor: { ...p.competitor, fare_type: v } }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Econômica", "Executiva", "Premium Economy", "Primeira"].map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {parseBR(formData.competitor.value) > 0 && calc.saleTotal > 0 && (
              <div className="p-3 rounded-lg bg-muted/40 border text-sm">
                Nosso preço: <strong>{formatBRL(calc.saleTotal)}</strong> vs Concorrência:{" "}
                <strong>{formatBRL(parseBR(formData.competitor.value))}</strong> →{" "}
                <span className="text-success">
                  Economia de {formatBRL(parseBR(formData.competitor.value) - calc.saleTotal)} (
                  {(((parseBR(formData.competitor.value) - calc.saleTotal) / parseBR(formData.competitor.value)) * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 4E - Serviços adicionais */}
      {!isParceiroMode && (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Serviços Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "insurance", label: "Seguro Viagem" },
            { key: "transfer", label: "Transfer" },
          ].map((s) => (
            <div key={s.key} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
              <Checkbox
                id={`svc-${s.key}`}
                checked={formData.services[s.key].active}
                onCheckedChange={(c) =>
                  setFormData((p) => ({
                    ...p,
                    services: { ...p.services, [s.key]: { ...p.services[s.key], active: !!c } },
                  }))
                }
              />
              <Label htmlFor={`svc-${s.key}`} className="text-sm cursor-pointer">{s.label}</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="R$"
                disabled={!formData.services[s.key].active}
                value={formData.services[s.key].value}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    services: { ...p.services, [s.key]: { ...p.services[s.key], value: sanitizeBRInput(e.target.value) } },
                  }))
                }
                className="w-32"
              />
            </div>
          ))}
        </CardContent>
      </Card>
      )}

      {/* Total */}
      {!isParceiroMode && (
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">VALOR TOTAL DA PROPOSTA</div>
            <div className="text-2xl font-bold mt-1">{formatBRL(calc.total)}</div>
          </div>
          <DollarSign className="h-10 w-10 opacity-30" />
        </CardContent>
      </Card>
      )}
    </div>
  );
}
