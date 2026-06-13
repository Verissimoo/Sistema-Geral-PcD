import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Plane, Calendar, User, Phone, Mail, DollarSign,
  Save, FileText, AlertCircle, TrendingUp, Loader2, CheckCircle2,
  Briefcase, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { Checkbox } from "@/shared/ui/checkbox";
import { useToast } from "@/shared/ui/use-toast";
import { cn } from "@/shared/lib/utils";
import { useQuote, useUpdateQuote, usePartner, usePartnerCompany } from "@/api/hooks";
import { getPartner, getPartnerCompany } from "@/api/partners";
import { openQuoteInNewTab } from "@/features/orcamento/lib/generateQuoteHTML";
import { useAuth } from "@/features/auth/AuthContext";
import { parseBR, sanitizeBRInput } from "@/shared/lib/parseBR";
import { sanitizeQuoteForPartner } from "@/features/orcamento/lib/sanitizeQuoteForPartner";
import { formatBRL, formatDateBR } from "@/shared/lib/format";

export default function ParceiroOrcamentoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  // Trava síncrona contra clique duplo no botão de definir preço.
  const isSavingRef = useRef(false);

  const [saleValue, setSaleValue] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [partnerInfo, setPartnerInfo] = useState({ name: "", phone: "", email: "" });
  const [coBranding, setCoBranding] = useState(false);

  const {
    data: rawQuote,
    isLoading: quoteLoading,
    isFetched: quoteFetched,
  } = useQuote(id);
  const updateQuote = useUpdateQuote();

  // Empresa do parceiro (para o PDF)
  const { data: partner, isLoading: partnerLoading } = usePartner(user?.id);
  const { data: company = null, isLoading: companyLoading } = usePartnerCompany(
    partner?.company_id
  );

  // Sanitização defensiva: a página só consome a versão sem
  // custos/Nipon/RAV/comissão — assim React DevTools e Network também
  // ficam limpos para a parceira inspecionando o DOM.
  const quote = useMemo(() => {
    if (!rawQuote || rawQuote.partner_id !== user?.id) return null;
    return sanitizeQuoteForPartner(rawQuote);
  }, [rawQuote, user?.id]);

  // Orçamento inexistente ou de outro parceiro: avisa e volta para a lista.
  useEffect(() => {
    if (!user?.id || !quoteFetched) return;
    if (!rawQuote) {
      toast({ title: "Orçamento não encontrado", variant: "destructive" });
      navigate("/parceiro/orcamentos", { replace: true });
      return;
    }
    if (rawQuote.partner_id !== user.id) {
      toast({ title: "Você não tem acesso a este orçamento", variant: "destructive" });
      navigate("/parceiro/orcamentos", { replace: true });
    }
  }, [rawQuote, quoteFetched, user?.id, navigate, toast]);

  // Preenche o formulário uma única vez por orçamento (refetches posteriores
  // não sobrescrevem o que a parceira estiver digitando).
  const seededQuoteIdRef = useRef(null);
  useEffect(() => {
    if (!quote || seededQuoteIdRef.current === quote.id) return;
    seededQuoteIdRef.current = quote.id;
    if (quote.partner_sale_value != null) {
      setSaleValue(
        Number(quote.partner_sale_value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      );
    }
    if (quote.partner_client_data) {
      setClientName(quote.partner_client_data.name || "");
      setClientPhone(quote.partner_client_data.phone || "");
      setClientEmail(quote.partner_client_data.email || "");
      setPartnerInfo({
        name: quote.partner_client_data.partner_name || user?.name || "",
        phone: quote.partner_client_data.partner_phone || user?.phone || "",
        email: quote.partner_client_data.partner_email || user?.email || "",
      });
    } else {
      setPartnerInfo({
        name: user?.name || "",
        phone: user?.phone || "",
        email: user?.email || "",
      });
    }
    setCoBranding(quote.partner_co_branding === true);
  }, [quote, user?.name, user?.phone, user?.email]);

  // Mantém o spinner enquanto carrega — e também enquanto o redirect acima
  // estiver em andamento (orçamento inválido), como no comportamento original.
  const accessInvalid = quoteFetched && (!rawQuote || rawQuote.partner_id !== user?.id);
  const loading =
    !user?.id || quoteLoading || partnerLoading || companyLoading || accessInvalid;

  // Floor de margem para a parceira = o que ela paga à PCD. NUNCA derivar de
  // pricing.nipon_value (campo interno PCD que a sanitização remove); sempre
  // ler do partner_base_sale_value (definido pelo vendedor via RAV/Desconto/Valor)
  // com fallback para total_value (idem em quotes antigas).
  const niponBase = useMemo(() => {
    if (!quote) return 0;
    return (
      Number(quote.partner_base_sale_value) ||
      Number(quote.total_value) ||
      0
    );
  }, [quote]);

  const saleValueNumber = parseBR(saleValue);
  const margem = saleValueNumber - niponBase;
  const margemValida = saleValueNumber > 0 && margem >= 0;

  const handleSave = async () => {
    if (isSavingRef.current) return;
    if (saleValueNumber <= 0) {
      toast({ title: "Informe um valor de venda válido", variant: "destructive" });
      return;
    }
    if (!partnerInfo.name?.trim() || !partnerInfo.phone?.trim()) {
      toast({
        title: "Seus dados de parceiro são obrigatórios",
        description: "Preencha pelo menos nome e telefone.",
        variant: "destructive",
      });
      return;
    }
    if (!clientName.trim()) {
      toast({ title: "Nome do cliente é obrigatório", variant: "destructive" });
      return;
    }
    isSavingRef.current = true;
    setSaving(true);
    try {
      // IMPORTANTE: não enviamos `pricing` no update — o state local tem a
      // versão sanitizada (sem cost_brl/nipon_value/RAV/etc), e re-gravá-la
      // apagaria todos os campos internos da PCD. A parceira só escreve em
      // campos top-level partner_* e total_value.
      const updates = {
        partner_sale_value: saleValueNumber,
        partner_client_data: {
          name: clientName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim(),
          partner_name: partnerInfo.name.trim(),
          partner_phone: partnerInfo.phone.trim(),
          partner_email: partnerInfo.email.trim(),
        },
        partner_co_branding: coBranding,
        total_value: saleValueNumber,
      };
      await updateQuote.mutateAsync({ id: quote.id, updates });
      toast({ title: "Orçamento atualizado!", description: "Valor e dados do cliente salvos." });
    } catch {
      // Erro já exibido pelo toast central (query-client); o catch só
      // impede que a falha escape do handler.
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const handleViewPDF = async () => {
    if (!quote) return;
    const finalSale = saleValueNumber > 0 ? saleValueNumber : (quote.partner_sale_value || niponBase);

    // Persiste a preferência de co-branding antes de gerar
    if (quote.partner_co_branding !== coBranding) {
      try {
        await updateQuote.mutateAsync({
          id: quote.id,
          updates: { partner_co_branding: coBranding },
        });
      } catch {
        /* não bloqueia geração */
      }
    }

    // Recarrega empresa em caso de alteração recente
    let companyForPDF = company;
    if (!companyForPDF) {
      try {
        const freshPartner = await getPartner(user.id);
        if (freshPartner?.company_id) {
          companyForPDF = await getPartnerCompany(freshPartner.company_id);
        }
      } catch {
        /* segue sem empresa — não bloqueia geração */
      }
    }

    openQuoteInNewTab({
      quote_number: quote.quote_number || `PCD-${quote.id?.slice(0, 5).toUpperCase()}`,
      client: {
        name: clientName || quote.partner_client_data?.name || "Cliente",
        phone: clientPhone || quote.partner_client_data?.phone || "",
        email: clientEmail || quote.partner_client_data?.email || "",
      },
      product: quote.product,
      ticket_type: quote.ticket_type,
      itinerary: quote.itinerary,
      dates: quote.dates,
      passengers: quote.passengers,
      baggage: quote.baggage,
      pricing: { ...(quote.pricing || {}), sale_value: finalSale },
      additional: null,
      competitor: null,
      services: { insurance: { active: false, value: 0 }, transfer: { active: false, value: 0 } },
      total_value: finalSale,
      commission: { base: 0, extra: 0, total: 0 },
      seller_name: partnerInfo.name || user?.name || "Parceiro",
      created_date: quote.created_date,
      // Dados de co-branding e empresa do parceiro
      recipient_type: "parceiro",
      partner_co_branding: coBranding,
      company: companyForPDF,
      partner_client_data: {
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        partner_name: partnerInfo.name,
        partner_phone: partnerInfo.phone,
        partner_email: partnerInfo.email,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!quote) return null;

  const isPriced = quote.partner_sale_value != null && Number(quote.partner_sale_value) > 0;
  const trechos = quote.itinerary?.trechos || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Voltar */}
      <Button variant="ghost" onClick={() => navigate("/parceiro/orcamentos")} className="gap-2 -ml-3">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      {/* Aviso: empresa não configurada */}
      {!company && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
          <div className="text-sm text-warning">
            Você ainda não configurou sua empresa. Você pode precificar normalmente, mas os PDFs gerados não terão sua identidade visual.
            <button
              type="button"
              onClick={() => navigate("/parceiro/empresa")}
              className="text-warning font-semibold underline ml-1"
            >
              Configurar agora
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            {quote.quote_number || `PCD-${quote.id?.slice(0, 5).toUpperCase()}`}
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Orçamento — definir preço final</h1>
        </div>
        {isPriced ? (
          <Badge className="bg-success/10 text-success border border-success/30 hover:bg-success/10 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Já precificado
          </Badge>
        ) : (
          <Badge className="bg-warning/10 text-warning border border-warning/30 hover:bg-warning/10">
            Aguardando seu preço
          </Badge>
        )}
      </div>

      {/* Itinerário */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plane className="h-4 w-4" /> Itinerário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trechos.map((t, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
                <span className="font-medium">
                  {t.companhia} {t.numero_voo && `· ${t.numero_voo}`}
                </span>
              </div>
              <div className="mt-2 font-semibold">
                {t.origem_cidade || t.origem_iata} ({t.origem_iata}) → {t.destino_cidade || t.destino_iata} ({t.destino_iata})
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Saída {t.horario_saida} · Chegada {t.horario_chegada} · {t.duracao}
                {t.escalas > 0 && ` · ${t.escalas} escala(s) via ${t.aeroporto_escala || "—"}`}
              </div>
            </div>
          ))}
          <Separator className="my-1" />
          <div className="text-sm flex items-center gap-3 text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateBR(quote.dates?.departure)}
              {!quote.dates?.one_way && quote.dates?.return && ` → ${formatDateBR(quote.dates?.return)}`}
            </span>
            <span>· {quote.passengers} pax</span>
            {quote.ticket_type && <span>· Tipo: {quote.ticket_type}</span>}
          </div>
        </CardContent>
      </Card>

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
              onChange={(e) => setSaleValue(sanitizeBRInput(e.target.value))}
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

      {/* Dados do parceiro (você) */}
      <Card className="border-warning/30 bg-warning/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-warning">
            <Briefcase className="h-4 w-4" /> Seus dados (Parceiro)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Seu nome *</Label>
            <Input
              id="p-name"
              value={partnerInfo.name}
              onChange={(e) => setPartnerInfo((p) => ({ ...p, name: e.target.value }))}
              placeholder="Como aparecerá no orçamento"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Seu telefone *
              </Label>
              <Input
                id="p-phone"
                value={partnerInfo.phone}
                onChange={(e) => setPartnerInfo((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Seu email{" "}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="p-email"
                type="email"
                value={partnerInfo.email}
                onChange={(e) => setPartnerInfo((p) => ({ ...p, email: e.target.value }))}
                placeholder="voce@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do cliente */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" /> Dados do cliente final
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cli-name">Nome do cliente *</Label>
            <Input
              id="cli-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: João da Silva"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cli-phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Telefone
              </Label>
              <Input
                id="cli-phone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(61) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cli-email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input
                id="cli-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!margemValida && saleValueNumber > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm text-warning">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Confirme se realmente quer vender abaixo do Nipon — não há margem positiva.</span>
        </div>
      )}

      {/* Co-branding */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={coBranding}
              onCheckedChange={(v) => setCoBranding(v === true)}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-warning" />
                Mostrar parceria com PassagensComDesconto
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Adiciona a tag "em parceria com PassagensComDesconto" no rodapé do PDF, junto da logo.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={
            saving ||
            saleValueNumber <= 0 ||
            !clientName.trim() ||
            !partnerInfo.name.trim() ||
            !partnerInfo.phone.trim()
          }
          className="bg-accent hover:bg-accent text-white gap-2 h-12"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar e gerar orçamento final"}
        </Button>
        <Button
          variant="outline"
          onClick={handleViewPDF}
          disabled={saleValueNumber <= 0 && !isPriced}
          className="gap-2 h-12"
        >
          <FileText className="h-4 w-4" /> Visualizar PDF
        </Button>
      </div>
    </div>
  );
}
