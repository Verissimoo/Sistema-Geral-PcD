import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/shared/ui/use-toast";
import { useQuote, useUpdateQuote, usePartner, usePartnerCompany } from "@/api/hooks";
import { getPartner, getPartnerCompany } from "@/api/partners";
import { openQuoteInNewTab } from "@/features/orcamento/lib/generateQuoteHTML";
import { useAuth } from "@/features/auth/AuthContext";
import { parseBR } from "@/shared/lib/parseBR";
import { sanitizeQuoteForPartner } from "@/features/orcamento/lib/sanitizeQuoteForPartner";

// Estado + efeitos + derivações + handlers da tela de precificação do parceiro.
// Extraído de ParceiroOrcamentoDetalhe sem alterar comportamento (mantém a
// ordem dos hooks, o timing dos efeitos e o fluxo de sanitização).
export function useParceiroOrcamentoForm(id) {
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

  return {
    navigate,
    quote,
    company,
    loading,
    saving,
    saleValue,
    setSaleValue,
    clientName,
    setClientName,
    clientPhone,
    setClientPhone,
    clientEmail,
    setClientEmail,
    partnerInfo,
    setPartnerInfo,
    coBranding,
    setCoBranding,
    niponBase,
    saleValueNumber,
    margem,
    margemValida,
    handleSave,
    handleViewPDF,
  };
}
