import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Check, Loader2, Copy, MessageCircle, Handshake, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/shared/ui/dialog";
import { useToast } from "@/shared/ui/use-toast";
import { createQuote } from "@/api/quotes";
import { supabase } from "@/shared/lib/supabase";
import { openQuoteInNewTab } from "@/features/orcamento/lib/generateQuoteHTML";
import { computePricingTotals, buildCommissionSnapshot } from "@/shared/lib/pricingCalculator";
import { useAuth } from "@/features/auth/AuthContext";
import { parseBR } from "@/shared/lib/parseBR";
import { formatBRL } from "@/shared/lib/format";
import {
  formatDateBR, getSegmentos, gerarNumeroPCDUnico,
} from "@/features/orcamento/lib/orcamentoHelpers";
import Row from "@/features/orcamento/components/Row";

// Remove as fotos efêmeras do pacote antes de gravar (não vão pro banco) e
// normaliza os valores monetários dos quartos. Mantém os metadados.
function stripPackageForSave(pkg) {
  const base = pkg || { include_flight: true, hotel: null, additionals: [] };
  // Adicionais: normaliza valores BR → número (nome + valor de venda).
  const additionals = Array.isArray(base.additionals)
    ? base.additionals.map((a) => ({ name: a.name ?? a.nome ?? "", value: parseBR(a.value ?? a.valor) }))
    : [];
  if (!base.hotel) return { ...base, additionals };
  const hotel = base.hotel;
  return {
    ...base,
    additionals,
    hotel: {
      ...hotel,
      photos: [], // fotos do hotel — efêmeras, não persistem
      nights: hotel.nights === "" || hotel.nights == null ? null : Number(hotel.nights),
      // Comissão da consolidadora (interna) e quarto principal do cálculo persistem.
      hotel_commission: parseBR(hotel.hotel_commission),
      selected_room_id: hotel.selected_room_id ?? null,
      rooms: Array.isArray(hotel.rooms)
        ? hotel.rooms.map((r) => ({
            id: r.id,
            name: r.name,
            value: parseBR(r.value),
            photo: null, // foto do quarto — efêmera, não persiste
          }))
        : [],
    },
  };
}

// ─── Bloco 5 — Gerar ────────────────────────────────────────────────
export default function BlocoGerar({ formData, totalValue, commission, onSaved }) {
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappText, setWhatsappText] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedQuote, setSavedQuote] = useState(null);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [saving, setSaving] = useState(false);
  // Trava síncrona contra clique duplo: setSaving é assíncrono, então cliques
  // dentro do mesmo tick do React não veem saving=true; o ref fecha essa janela.
  const isSavingRef = useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isParceiroMode = formData.recipient_type === "parceiro";

  const buildWhatsapp = () => {
    const t = formData;
    const trechos = t.itinerary.trechos || [];
    let texto = `✈️ PassagensComDesconto\n📌 CADASTUR: 62830477000151\n\n`;
    const greetName = isParceiroMode ? (t.partner_name || "parceiro") : (t.client?.name || "");
    texto += `Olá ${greetName}! Segue sua cotação personalizada com todo suporte da nossa agência.\n\n`;
    const isSplit = t.ticket_type === "Quebra de Trecho";
    texto += `🛫 ITINERÁRIO:\n`;
    trechos.forEach((tr) => {
      const segmentos = getSegmentos(tr);
      const stops = segmentos
        .slice(0, -1)
        .map((s) => s.destino_iata)
        .filter(Boolean);
      const escalaInfo =
        tr.escalas > 0
          ? `${tr.escalas} escala(s)${stops.length ? ` via ${stops.join(" / ")}` : ""}`
          : "Voo direto";
      texto += `${tr.tipo === "volta" ? "↩️ VOLTA: " : ""}${tr.origem_cidade} (${tr.origem_iata}) ➝ ${tr.destino_cidade} (${tr.destino_iata})\n`;
      texto += `✈️ ${escalaInfo}\n`;

      if (segmentos.length > 1) {
        segmentos.forEach((s, si) => {
          texto += `  • Voo ${si + 1}: ${s.companhia || ""}${s.numero_voo ? ` ${s.numero_voo}` : ""} — ${s.origem_iata}→${s.destino_iata} · ${s.horario_saida || ""}→${s.horario_chegada || ""}${s.duracao ? ` · ${s.duracao}` : ""}\n`;
          if (si < segmentos.length - 1) {
            const espera = tr.tempo_escalas?.[si]?.duracao;
            if (espera) texto += `    ⏳ Escala em ${s.destino_iata}: ${espera}\n`;
          }
        });
      } else {
        texto += `🕒 Saída: ${tr.horario_saida}\n🕒 Chegada: ${tr.horario_chegada}\n`;
      }
      texto += `⏱️ Duração total: ${tr.tempo_total || tr.duracao || "—"}\n`;
      if (isSplit) {
        const cls = tr.classe || "Econômica";
        const bg = tr.baggage || {};
        const bagPieces = [];
        if (Number(bg.personal) > 0) bagPieces.push("🎒 artigo pessoal");
        if (Number(bg.carry_on) > 0) bagPieces.push(`🎒 ${bg.carry_on}× mão`);
        if (Number(bg.checked) > 0) bagPieces.push(`🧳 ${bg.checked}× despachada`);
        texto += `🎫 Classe: ${cls}${bagPieces.length ? ` · ${bagPieces.join(" · ")}` : ""}\n`;
      }
      texto += `\n`;
    });

    texto += `📅 DATAS:\n`;
    texto += `IDA: ${formatDateBR(t.departure_date)}\n`;
    texto += `VOLTA: ${t.one_way ? "Apenas ida" : formatDateBR(t.return_date)}\n\n`;

    texto += `💰 VALOR TOTAL: ${formatBRL(totalValue)}\n`;
    texto += `➡️ Consulte opções de parcelamento no cartão 💳\n\n`;

    texto += `👤 PASSAGEIROS:\n${t.passengers} ${t.passengers > 1 ? "Adultos" : "Adulto"}\n\n`;

    if (!isSplit) {
      const bagList = [];
      const pad2 = (n) => String(n).padStart(2, "0");
      const personalQty = Number(t.baggage.personal) || 0;
      const carryQty = Number(t.baggage.carry_on) || 0;
      const checkedQty = Number(t.baggage.checked) || 0;
      if (personalQty > 0)
        bagList.push(`🎒 ${pad2(personalQty)} ${personalQty > 1 ? "artigos pessoais" : "artigo pessoal"} (mochila/bolsa)`);
      if (carryQty > 0)
        bagList.push(`🎒 ${pad2(carryQty)} ${carryQty > 1 ? "bagagens de mão" : "bagagem de mão"} (10kg)`);
      if (checkedQty > 0)
        bagList.push(`🧳 ${pad2(checkedQty)} ${checkedQty > 1 ? "bagagens despachadas" : "bagagem despachada"} (23kg)`);
      if (bagList.length === 0) bagList.push("🎒 Bagagem não inclusa");
      texto += `${bagList.join("\n")}\n\n`;
    }

    if (t.services.insurance.active) texto += `🛡️ Seguro Viagem incluso (${formatBRL(parseBR(t.services.insurance.value))})\n`;
    if (t.services.transfer.active) texto += `🚗 Transfer incluso (${formatBRL(parseBR(t.services.transfer.value))})\n`;
    if (t.additional.active && t.additional.description) {
      texto += `➕ ${t.additional.description}: ${formatBRL(parseBR(t.additional.value))}\n`;
    }
    if (t.services.insurance.active || t.services.transfer.active || t.additional.active) texto += `\n`;

    texto += `✅ Taxas inclusas\n✅ Assessoria e suporte durante todo o trajeto\n✅ Check-in antecipado\n\n`;
    texto += `⚠️ Observações importantes:\nValores sujeitos a alteração até o fechamento 🚨\nTaxa de cancelamento conforme regras da cia aérea 🚨\nPagamento no crédito pode ter taxas adicionais 🚨\n\n`;
    texto += `📌 CNPJ: 62.830.477/0001-51\n📅 Data da cotação: ${new Date().toLocaleDateString("pt-BR")}`;

    return texto;
  };

  // Normaliza strings com vírgula/ponto BR para números (usado em persistência e geração de PDF).
  const buildNormalizedPayload = () => {
    const normalizedPricing = {
      ...formData.pricing,
      // Pacotes (passo de estrutura): gravados dentro do pricing (jsonb existente)
      // para não exigir migration. Ausência = orçamento aéreo (retrocompat).
      quote_kind: formData.quote_kind || "aereo",
      package: stripPackageForSave(formData.package),
      program: formData.pricing.program_name,
      miles_qty: parseBR(formData.pricing.miles_qty),
      tax: parseBR(formData.pricing.tax),
      cost_brl: Number(formData.pricing.cost_brl_calc) || parseBR(formData.pricing.cost_brl),
      cash_part: parseBR(formData.pricing.cash_part),
      cost_per_thousand: Number(formData.pricing.cost_per_thousand) || 0,
      // Consolidadora — normaliza para Number (toNumber no calc também tolera string)
      fare_total: parseBR(formData.pricing.fare_total),
      boarding_tax: parseBR(formData.pricing.boarding_tax),
      du_value: parseBR(formData.pricing.du_value),
      rav_value: parseBR(formData.pricing.rav_value),
      sale_value: parseBR(formData.pricing.sale_value),
    };
    if (Array.isArray(normalizedPricing.trechos)) {
      normalizedPricing.trechos = normalizedPricing.trechos.map((t) => ({
        ...t,
        miles_qty: parseBR(t.miles_qty),
        tax: parseBR(t.tax),
        cost_brl: parseBR(t.cost_brl),
      }));
    }
    // Multi-programa: normaliza milhas/taxa de cada trecho para Number
    if (Array.isArray(normalizedPricing.trechos_pricing)) {
      normalizedPricing.trechos_pricing = normalizedPricing.trechos_pricing.map((tp) => ({
        ...tp,
        miles_qty: parseBR(tp.miles_qty),
        tax: parseBR(tp.tax),
        cost_per_thousand: Number(tp.cost_per_thousand) || 0,
        sale_per_thousand: Number(tp.sale_per_thousand) || 0,
      }));
    }
    // Blocos extras de tipo de emissão: normaliza strings BR para Number.
    if (Array.isArray(normalizedPricing.extra_blocks)) {
      normalizedPricing.extra_blocks = normalizedPricing.extra_blocks.map((b) => ({
        ...b,
        miles_qty: parseBR(b.miles_qty),
        tax: parseBR(b.tax),
        cash_part: parseBR(b.cash_part),
        cost_brl: parseBR(b.cost_brl),
        cost_per_thousand: Number(b.cost_per_thousand) || 0,
        sale_per_thousand: Number(b.sale_per_thousand) || 0,
        cost_is_total: b.cost_is_total === true,
      }));
    }
    // Opções de pagamento (PDF): normaliza base_value para Number.
    if (Array.isArray(normalizedPricing.sale_options)) {
      normalizedPricing.sale_options = normalizedPricing.sale_options.map((o) => ({
        ...o,
        base_value: parseBR(o.base_value),
        boleto_installments: Number(o.boleto_installments) || 1,
        boleto_entrada: parseBR(o.boleto_entrada),
      }));
    }
    return {
      pricing: normalizedPricing,
      additional: formData.additional.active
        ? { ...formData.additional, value: parseBR(formData.additional.value) }
        : null,
      competitor: formData.competitor.active
        ? { ...formData.competitor, value: parseBR(formData.competitor.value) }
        : null,
      services: {
        insurance: {
          ...formData.services.insurance,
          value: parseBR(formData.services.insurance.value),
        },
        transfer: {
          ...formData.services.transfer,
          value: parseBR(formData.services.transfer.value),
        },
      },
    };
  };

  const persistQuote = async (text) => {
    if (savedQuote) return savedQuote;
    if (isSavingRef.current) {
      console.warn("[BlocoGerar] persistQuote já em andamento — ignorando clique duplicado.");
      return null;
    }
    isSavingRef.current = true;
    setSaving(true);
    try {
      // Gera o número apenas quando vai persistir de fato; única chamada por ciclo.
      let number = quoteNumber;
      if (!number) {
        number = await gerarNumeroPCDUnico();
        setQuoteNumber(number);
      }

      const { pricing: normalizedPricing, additional: normalizedAdditional, competitor: normalizedCompetitor, services: normalizedServices } = buildNormalizedPayload();

      const isParceiroMode = formData.recipient_type === "parceiro";

      // Nipon SEMPRE derivado pelo helper — gravamos só como snapshot informativo
      // pra que pricing.nipon_value armazenado coincida com o cálculo dinâmico
      // e relatórios externos (Supabase Studio) leiam o valor correto.
      const derivedTotals = computePricingTotals({
        ...formData,
        pricing: normalizedPricing,
      });
      const niponTotalDerived = derivedTotals.niponTotal;
      const pricingWithSyncedNipon = {
        ...normalizedPricing,
        nipon_value: derivedTotals.niponPerPax,
      };

      // Para parceiro, o vendedor já definiu sale_value via RAV/Desconto/Valor
      // no Bloco 4. Usamos esse valor diretamente — não sobrescrevemos com o
      // Nipon (modelo antigo). O `partner_base_sale_value` top-level guarda o
      // valor que a PCD cobra da parceira (floor de margem no portal dela).
      let finalSaleValueForPartner = 0;
      let finalPricing = pricingWithSyncedNipon;
      let finalTotalValue = totalValue;

      if (isParceiroMode) {
        const partnerSale = Number(normalizedPricing.sale_value) || 0;
        // Se o vendedor não definiu (vazio), assume Nipon como piso seguro.
        finalSaleValueForPartner = partnerSale > 0 ? partnerSale : niponTotalDerived;
        const diff = finalSaleValueForPartner - niponTotalDerived;
        finalPricing = {
          ...pricingWithSyncedNipon,
          sale_value: finalSaleValueForPartner,
          sale_per: "total",
          partner_rav: diff > 0 ? diff : 0,
          partner_desconto: diff < 0 ? Math.abs(diff) : 0,
        };
        finalTotalValue = finalSaleValueForPartner;
      }

      // Parceiro não gera comissão para o vendedor PCD — gravamos um snapshot
      // zerado com nota informativa. Cliente direto segue o cálculo padrão.
      const commissionSnapshot = isParceiroMode
        ? {
            base: 0,
            extra: 0,
            total: 0,
            base_rate: 0,
            _note: "Sem comissão — venda a parceiro",
          }
        : buildCommissionSnapshot({
            ...formData,
            pricing: finalPricing,
            total_value: finalTotalValue,
          });

      // createQuote (módulo puro) mantém a idempotência por quote_number do
      // localClient antigo, mas LANÇA em falha — preservamos o fluxo anterior
      // (console.error + toast + abort) com try/catch.
      let quote;
      try {
        quote = await createQuote({
        quote_number: number,
        recipient_type: formData.recipient_type || "cliente",
        partner_id: formData.partner_id || null,
        partner_name: formData.partner_name || null,
        client: isParceiroMode ? null : formData.client,
        client_id: isParceiroMode ? null : (formData.client?.id || null),
        product: formData.product,
        ticket_type: formData.ticket_type,
        itinerary: formData.itinerary,
        dates: {
          departure: formData.departure_date,
          return: formData.return_date,
          one_way: formData.one_way,
        },
        passengers: formData.passengers,
        baggage: formData.baggage,
        pricing: finalPricing,
        additional: isParceiroMode ? null : normalizedAdditional,
        competitor: normalizedCompetitor,
        services: isParceiroMode
          ? { insurance: { active: false, value: 0 }, transfer: { active: false, value: 0 } }
          : normalizedServices,
        total_value: finalTotalValue,
        // Valor que a PCD cobra da parceira — floor que a parceira vê no
        // portal dela ao definir o preço final ao cliente final.
        ...(isParceiroMode && { partner_base_sale_value: finalSaleValueForPartner }),
        commission: commissionSnapshot,
        seller_name: user?.name || "Equipe PCD",
        seller_id: user?.id || null,
        status: "Enviado",
        whatsapp_text: text,
        parent_quote_id: isParceiroMode ? null : (formData.parent_quote_id || null),
        quote_sequence: formData.quote_sequence || 1,
        });
      } catch (err) {
        console.error("Erro ao criar em pcd_quotes:", err);
        quote = null;
      }
      if (!quote) {
        toast({ title: "Erro ao salvar orçamento no servidor", variant: "destructive" });
        return null;
      }

      // Cria notificação para o gerente quando o vendedor cobrou preço
      // diferente do sugerido pela tabela (preserva o valor sugerido como
      // metadado). Não bloqueia o save se a notificação falhar.
      if (!isParceiroMode && finalPricing?.price_overridden === true) {
        try {
          const suggested = Number(finalPricing.suggested_price) || 0;
          const passengersCount = Math.max(1, Number(formData.passengers) || 1);
          const saleTotalReal =
            finalPricing.sale_per === "pessoa"
              ? Number(finalPricing.sale_value) * passengersCount
              : Number(finalPricing.sale_value);
          const diff = saleTotalReal - suggested;
          const direction = diff > 0 ? "acima" : "abaixo";
          const fmt = (v) =>
            Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          await supabase.from("pcd_notifications").insert({
            type: "price_override",
            quote_id: quote.id,
            quote_number: number,
            seller_id: user?.id || null,
            seller_name: user?.name || null,
            title: `Preço customizado em ${number}`,
            message: `${user?.name || "Vendedor"} cotou ${fmt(saleTotalReal)} ${direction} do sugerido (${fmt(suggested)}) — diferença de ${fmt(Math.abs(diff))}.`,
            metadata: {
              suggested: suggested,
              actual: saleTotalReal,
              difference: diff,
              client_name: formData.client?.name || formData.partner_name || null,
              passengers: passengersCount,
            },
            target_role: "gerente",
          });
        } catch (err) {
          console.warn("[BlocoGerar] Falha ao criar notificação de override:", err);
        }
      }

      setSavedQuote(quote);
      onSaved?.(quote);
      toast({ title: "Orçamento salvo com sucesso!" });
      return quote;
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const handleWhatsapp = async () => {
    const txt = buildWhatsapp();
    setWhatsappText(txt);
    const persisted = await persistQuote(txt);
    // Só abre o modal se conseguiu persistir (ou se já estava salvo)
    if (persisted || savedQuote) setWhatsappOpen(true);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGerarPDF = async () => {
    const txt = buildWhatsapp();
    const persisted = await persistQuote(txt);
    // Usa o número que efetivamente foi persistido (importante quando a corrida
    // de UNIQUE devolveu o registro existente em vez de criar um novo).
    const numberForPDF =
      persisted?.quote_number || savedQuote?.quote_number || quoteNumber;
    const normalized = buildNormalizedPayload();
    const niponBaseTotal =
      Number(normalized.pricing?.total_nipon) ||
      (Number(normalized.pricing?.nipon_value) || 0) *
        Math.max(1, Number(formData.passengers) || 1);
    // Para parceiro o PDF mostra o que ela paga: sale_value definido (RAV/desc/valor)
    // ou Nipon como fallback se vazio. Não mais sobrescrevemos com Nipon cego.
    const partnerSaleForPDF = isParceiroMode
      ? (Number(normalized.pricing?.sale_value) || niponBaseTotal)
      : 0;
    const finalTotal = isParceiroMode ? partnerSaleForPDF : totalValue;
    const finalPricing = isParceiroMode
      ? { ...normalized.pricing, sale_value: partnerSaleForPDF, sale_per: "total" }
      : normalized.pricing;
    openQuoteInNewTab({
      quote_number: numberForPDF,
      // Pacote: passa quote_kind + package CRU (com as fotos base64 efêmeras,
      // que vivem só no estado e nunca vão pro banco) para o PDF injetar.
      quote_kind: formData.quote_kind || "aereo",
      package: formData.package || null,
      recipient_type: formData.recipient_type || "cliente",
      partner_id: formData.partner_id || null,
      partner_name: formData.partner_name || null,
      client: isParceiroMode
        ? { name: formData.partner_name || "Parceiro" }
        : formData.client,
      product: formData.product,
      ticket_type: formData.ticket_type,
      itinerary: formData.itinerary,
      dates: {
        departure: formData.departure_date,
        return: formData.return_date,
        one_way: formData.one_way,
      },
      passengers: formData.passengers,
      baggage: formData.baggage,
      pricing: finalPricing,
      additional: isParceiroMode ? null : normalized.additional,
      competitor: normalized.competitor,
      services: isParceiroMode
        ? { insurance: { active: false, value: 0 }, transfer: { active: false, value: 0 } }
        : normalized.services,
      total_value: finalTotal,
      commission: isParceiroMode ? { base: 0, extra: 0, total: 0 } : commission,
      seller_name: user?.name || "Equipe PCD",
      created_date: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4 relative">
      {/* Overlay durante salvamento — bloqueia cliques fora do botão e tranquiliza o usuário */}
      {saving && (
        <div className="absolute inset-0 bg-bg-surface backdrop-blur-[1px] z-50 flex items-center justify-center rounded-lg">
          <div className="bg-bg-surface rounded-xl shadow-lg p-5 flex items-center gap-3 border border-border">
            <Loader2 className="w-6 h-6 text-warning animate-spin" />
            <div>
              <p className="font-semibold text-sm">Salvando orçamento…</p>
              <p className="text-xs text-muted-foreground">Não feche a página.</p>
            </div>
          </div>
        </div>
      )}

      {/* Resumo destinatário */}
      {isParceiroMode ? (
        <Card className="border-border/50 border-accent/30 bg-accent/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Handshake className="h-4 w-4 text-accent" /> Parceiro
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><strong>{formData.partner_name}</strong></div>
            <div className="text-muted-foreground">
              Você definiu o valor que a PCD vai cobrar — o parceiro acrescentará a margem dele no portal.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Cliente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><strong>{formData.client?.name}</strong></div>
            <div className="text-muted-foreground">{formData.client?.phone || "—"} · {formData.client?.lead_origin || "—"}</div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Itinerário</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          {formData.itinerary.trechos.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
              <span>
                {t.origem_iata} ({t.horario_saida}) → {t.destino_iata} ({t.horario_chegada}) ·{" "}
                <span className="text-muted-foreground">{t.companhia} {t.numero_voo}</span>
              </span>
            </div>
          ))}
          <div className="text-muted-foreground pt-1">
            {formatDateBR(formData.departure_date)}
            {!formData.one_way && formData.return_date && ` → ${formatDateBR(formData.return_date)}`}
            {" · "}{formData.passengers} pax
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Precificação</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <Row label="Custo total (Nipon)" value={formatBRL(formData.pricing.nipon_value || formData.pricing.total_nipon || 0)} />
          {!isParceiroMode && (
            <>
              <Row label="Valor de venda" value={formatBRL(formData.pricing.sale_value)} />
              <Row label="Comissão do vendedor" value={formatBRL(commission.total)} bold />
            </>
          )}
          {isParceiroMode && (
            <Row
              label="Valor cobrado da parceira"
              value={formatBRL(parseBR(formData.pricing.sale_value))}
              bold
            />
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">
              {isParceiroMode ? "VALOR COBRADO DA PARCEIRA" : "VALOR TOTAL DA PROPOSTA"}
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatBRL(isParceiroMode
                ? (parseBR(formData.pricing.sale_value) || formData.pricing.nipon_value || 0)
                : totalValue)}
            </div>
          </div>
          <Sparkles className="h-10 w-10 opacity-30" />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <Button
          onClick={handleWhatsapp}
          disabled={saving}
          className="bg-success hover:bg-success text-white gap-2 h-12 disabled:opacity-70"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
          {saving ? "Salvando..." : "📱 Gerar texto WhatsApp"}
        </Button>
        <Button
          onClick={handleGerarPDF}
          disabled={saving}
          className="bg-[#0D2B6E] hover:bg-[#0A2259] text-white gap-2 h-12 disabled:opacity-70"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
          {saving ? "Salvando..." : "📄 Gerar PDF profissional"}
        </Button>
      </div>

      {savedQuote && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/30 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" /> Orçamento salvo
          </span>
          <Button variant="link" size="sm" onClick={() => navigate("/vendedor/orcamentos")}>
            Ver no painel de orçamentos
          </Button>
        </div>
      )}

      {/* Modal WhatsApp */}
      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Texto do WhatsApp</DialogTitle>
            <DialogDescription>
              Copie e cole no WhatsApp do cliente.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            value={whatsappText}
            className="min-h-[400px] font-mono text-xs"
          />
          <DialogFooter>
            <Button onClick={copy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
