import { useParams } from "react-router-dom";
import {
  ArrowLeft, Save, FileText, AlertCircle, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useParceiroOrcamentoForm } from "@/features/orcamento/hooks/useParceiroOrcamentoForm";
import { ParceiroItinerarioCard } from "@/features/orcamento/components/ParceiroItinerarioCard";
import { ParceiroPrecoCard } from "@/features/orcamento/components/ParceiroPrecoCard";
import {
  ParceiroDadosCard, CoBrandingCard,
} from "@/features/orcamento/components/ParceiroDadosCard";

export default function ParceiroOrcamentoDetalhe() {
  const { id } = useParams();
  const {
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
  } = useParceiroOrcamentoForm(id);

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!quote) return null;

  const isPriced = quote.partner_sale_value != null && Number(quote.partner_sale_value) > 0;

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
      <ParceiroItinerarioCard quote={quote} />

      {/* Custo recebido + Definir preço */}
      <ParceiroPrecoCard
        niponBase={niponBase}
        saleValue={saleValue}
        onSaleValueChange={setSaleValue}
        saleValueNumber={saleValueNumber}
        margem={margem}
        margemValida={margemValida}
      />

      {/* Dados do parceiro + cliente */}
      <ParceiroDadosCard
        partnerInfo={partnerInfo}
        onPartnerInfoChange={setPartnerInfo}
        clientName={clientName}
        onClientNameChange={setClientName}
        clientPhone={clientPhone}
        onClientPhoneChange={setClientPhone}
        clientEmail={clientEmail}
        onClientEmailChange={setClientEmail}
      />

      {!margemValida && saleValueNumber > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm text-warning">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Confirme se realmente quer vender abaixo do Nipon — não há margem positiva.</span>
        </div>
      )}

      {/* Co-branding */}
      <CoBrandingCard coBranding={coBranding} onCoBrandingChange={setCoBranding} />

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
