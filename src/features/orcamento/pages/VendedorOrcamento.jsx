import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { useToast } from "@/shared/ui/use-toast";
import { getQuote, listQuotes } from "@/api/quotes";
import { computeCommission } from "@/shared/lib/pricingCalculator";
import { parseBR } from "@/shared/lib/parseBR";
import { initialFormData } from "@/features/orcamento/lib/orcamentoHelpers";
import Stepper from "@/features/orcamento/components/Stepper";
import BlocoCliente from "@/features/orcamento/components/BlocoCliente";
import BlocoProduto from "@/features/orcamento/components/BlocoProduto";
import BlocoItinerario from "@/features/orcamento/components/BlocoItinerario";
import BlocoPrecificacao from "@/features/orcamento/components/BlocoPrecificacao";
import BlocoGerar from "@/features/orcamento/components/BlocoGerar";

// ─── Componente Principal ───────────────────────────────────────────
export default function VendedorOrcamento() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [searchParams, setSearchParams] = useSearchParams();
  const fromQuoteId = searchParams.get("from");
  const { toast: orcamentoToast } = useToast();

  const apiKeyMissing = !import.meta.env.VITE_ANTHROPIC_API_KEY;

  // Pré-preenche o gerador a partir de uma cotação existente (mesmo cliente, novos voos)
  useEffect(() => {
    if (!fromQuoteId) return;
    let cancelled = false;
    (async () => {
      // getQuote/listQuotes lançam em falha de rede (o localClient antigo
      // engolia e devolvia null/[]); os catches abaixo preservam o fluxo silencioso.
      let parent;
      try {
        parent = await getQuote(fromQuoteId);
      } catch (err) {
        console.error("Erro ao buscar cotação de origem:", err);
        return;
      }
      if (!parent || cancelled) return;
      // Apenas para destinatário "cliente"
      if (parent.recipient_type === "parceiro") {
        orcamentoToast({
          title: "Cotação derivada não disponível",
          description: "Cotações de parceiro não suportam derivação.",
          variant: "destructive",
        });
        return;
      }
      let all;
      try {
        all = (await listQuotes()) || [];
      } catch (err) {
        console.error("Erro ao listar cotações:", err);
        all = [];
      }
      // Conta head + filhos da mesma família para gerar a sequence
      const headId = parent.parent_quote_id || parent.id;
      const siblings = all.filter(
        (q) => q.id === headId || q.parent_quote_id === headId
      );
      const nextSequence = siblings.length + 1;

      setFormData((prev) => ({
        ...prev,
        recipient_type: "cliente",
        partner_id: null,
        partner_name: null,
        client: parent.client || null,
        passengers: parent.passengers || 1,
        baggage: parent.baggage || prev.baggage,
        product: parent.product || prev.product,
        ticket_type: parent.ticket_type || prev.ticket_type,
        parent_quote_id: headId,
        quote_sequence: nextSequence,
        // Limpa os dados que devem ser preenchidos novamente
        flight_images: [],
        itinerary: { trechos: [] },
        itinerary_reviewed: false,
        departure_date: "",
        return_date: "",
        one_way: false,
        pricing: { ...initialFormData.pricing },
        additional: { ...initialFormData.additional },
        competitor: { ...initialFormData.competitor },
        services: { ...initialFormData.services },
      }));
      // Pula o Bloco 1 (Cliente) já preenchido
      setCompletedSteps((p) => Array.from(new Set([...p, 1])));
      setCurrentStep(2);
      orcamentoToast({
        title: "Nova cotação para o mesmo cliente",
        description: `Cotação #${nextSequence} para ${parent.client?.name || "este cliente"}. Preencha os novos voos e valores.`,
      });
    })();
    return () => { cancelled = true; };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionalmente estreitas (efeito de sync); incluir as faltantes mudaria comportamento
  }, [fromQuoteId]);

  const unlinkParent = () => {
    setFormData((p) => ({ ...p, parent_quote_id: null, quote_sequence: 1 }));
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    setSearchParams(next, { replace: true });
    orcamentoToast({
      title: "Vínculo removido",
      description: "Esta cotação não estará mais vinculada ao cliente anterior.",
    });
  };

  // Cálculos derivados — considera nº de passageiros e modo "Cobrado por: pessoa | total".
  const totalValue = useMemo(() => {
    const pr = formData.pricing;
    const pax = Math.max(1, Number(formData.passengers) || 1);
    const saleInput = parseBR(pr.sale_value);
    const saleTotal = pr.sale_per === "total" ? saleInput : saleInput * pax;
    return (
      saleTotal +
      (formData.additional.active ? parseBR(formData.additional.value) : 0) +
      (formData.services.insurance.active ? parseBR(formData.services.insurance.value) : 0) +
      (formData.services.transfer.active ? parseBR(formData.services.transfer.value) : 0)
    );
  }, [formData]);

  // Comissão calculada via fonte única (pricingCalculator). Inclui detecção
  // de Carteira própria (30% no lucro Nipon) e multiplicação correta por pax.
  const commission = useMemo(() => {
    const result = computeCommission(formData);
    return {
      base: result.comissaoBase,
      extra: result.comissaoExtra,
      total: result.total,
    };
  }, [formData]);

  // Validação por bloco
  const isParceiroMode = formData.recipient_type === "parceiro";
  // Tipo de orçamento e controle de voo no pacote.
  const isPacote = formData.quote_kind === "pacote";
  const includeFlight = formData.package?.include_flight !== false;
  const showFlightSection = !isPacote || includeFlight;
  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 1:
        return isParceiroMode ? !!formData.partner_id : !!formData.client?.id;
      case 2: return formData.product === "aereo";
      case 3:
        // Pacote sem voo: não exige itinerário/datas.
        if (isPacote && !includeFlight) return true;
        return (
          formData.itinerary.trechos.length > 0 &&
          formData.itinerary_reviewed &&
          !!formData.departure_date &&
          (formData.one_way || !!formData.return_date)
        );
      case 4: {
        if (isParceiroMode) {
          // Parceiro: basta ter Nipon definido (custo preenchido).
          const nipon = Number(formData.pricing?.nipon_value) || Number(formData.pricing?.total_nipon) || 0;
          return nipon > 0;
        }
        const sale = parseBR(formData.pricing.sale_value);
        return sale > 0;
      }
      default: return true;
    }
  }, [currentStep, formData, isParceiroMode, isPacote, includeFlight]);

  const next = () => {
    if (!canAdvance) return;
    setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
    setCurrentStep((s) => Math.min(5, s + 1));
  };
  const prev = () => setCurrentStep((s) => Math.max(1, s - 1));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gerador de Orçamento</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Preencha as informações para gerar sua cotação profissional
        </p>
      </div>

      {/* Tipo de orçamento — Aéreo (atual) ou Pacote (voo opcional + hotel) */}
      <Card className="border-border/50">
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <Label className="text-sm font-medium">Tipo de orçamento</Label>
          <div className="flex gap-1 bg-muted rounded-md p-0.5">
            {[
              { key: "aereo", label: "Aéreo" },
              { key: "pacote", label: "Pacote" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFormData((p) => ({ ...p, quote_kind: opt.key }))}
                className={
                  "px-4 py-1.5 rounded text-sm font-medium transition-colors " +
                  (formData.quote_kind === opt.key
                    ? "bg-bg-surface shadow text-text-primary"
                    : "text-text-muted hover:text-text-primary")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          {isPacote && (
            <span className="text-xs text-text-muted">
              Voo opcional + hotel + adicionais (em construção).
            </span>
          )}
        </CardContent>
      </Card>

      {apiKeyMissing && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <span className="text-warning dark:text-warning">
            Configure VITE_ANTHROPIC_API_KEY no .env para usar a extração automática de itinerário.
          </span>
        </div>
      )}

      {formData.parent_quote_id && (
        <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-warning text-white flex items-center justify-center font-bold flex-shrink-0">
            #{formData.quote_sequence}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-warning">
              Nova cotação para {formData.client?.name || formData.partner_name || "este cliente"}
            </p>
            <p className="text-sm text-warning mt-1">
              Cotação #{formData.quote_sequence} para este cliente. Os dados de cliente, passageiros e bagagem foram mantidos. Preencha os novos voos e valores.
            </p>
          </div>
          <button
            type="button"
            onClick={unlinkParent}
            className="text-warning hover:text-warning text-sm underline shrink-0"
          >
            Desvincular
          </button>
        </div>
      )}

      {/* Stepper */}
      <Card className="border-border/50">
        <CardContent className="pt-5">
          <Stepper currentStep={currentStep} completedSteps={completedSteps} />
        </CardContent>
      </Card>

      {/* Conteúdo do bloco ativo */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">
            {currentStep === 1 && "1. Cliente"}
            {currentStep === 2 && "2. Produto"}
            {currentStep === 3 && "3. Itinerário"}
            {currentStep === 4 && "4. Precificação"}
            {currentStep === 5 && "5. Revisão e Geração"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && <BlocoCliente formData={formData} setFormData={setFormData} />}
          {currentStep === 2 && <BlocoProduto formData={formData} setFormData={setFormData} />}
          {currentStep === 3 && (
            <div className="space-y-6">
              {isPacote && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/30">
                  <Checkbox
                    id="no-flight"
                    checked={!includeFlight}
                    onCheckedChange={(c) =>
                      setFormData((p) => ({
                        ...p,
                        package: { ...(p.package || {}), include_flight: !c },
                      }))
                    }
                    className="mt-0.5"
                  />
                  <Label htmlFor="no-flight" className="text-sm cursor-pointer leading-snug font-medium">
                    Não incluir voo neste pacote
                    <span className="block text-xs text-text-muted font-normal mt-0.5">
                      Marque para um pacote só de hotel/adicionais. A seção de voos fica oculta e não é obrigatória.
                    </span>
                  </Label>
                </div>
              )}

              {showFlightSection && (
                <BlocoItinerario formData={formData} setFormData={setFormData} />
              )}

              {isPacote && (
                <>
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-muted">
                    Seção de Hotel (em construção)
                  </div>
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-muted">
                    Seção de Adicionais (em construção)
                  </div>
                </>
              )}
            </div>
          )}
          {currentStep === 4 && <BlocoPrecificacao formData={formData} setFormData={setFormData} />}
          {currentStep === 5 && (
            <BlocoGerar
              formData={formData}
              totalValue={totalValue}
              commission={commission}
              onSaved={() => setCompletedSteps((p) => Array.from(new Set([...p, 5])))}
            />
          )}
        </CardContent>
      </Card>

      {/* Footer Nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prev}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        {currentStep < 5 && (
          <Button onClick={next} disabled={!canAdvance} className="gap-2">
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
