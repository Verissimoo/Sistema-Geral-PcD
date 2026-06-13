import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileStack, Plus } from "lucide-react";
import QuickPriceEditDialog from "@/shared/components/QuickPriceEditDialog";
import { EmissionDialog } from "@/features/emissoes/components/EmissionDialog";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { useToast } from "@/shared/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/shared/lib/utils";
import { useQuotes, useMilesTable, useUpdateQuote } from "@/api/hooks";
import { qk } from "@/api/queryKeys";
import { openQuoteInNewTab } from "@/features/orcamento/lib/generateQuoteHTML";
import { useAuth } from "@/features/auth/AuthContext";
import { STATUS_LABELS, STATUS_STYLES } from "@/features/orcamento/lib/quoteStatus";
import { vendedorTimeAgo } from "@/features/orcamento/lib/vendedorTimeAgo";
import { useVendedorOrcamentosFilters } from "@/features/orcamento/hooks/useVendedorOrcamentosFilters";
import { useRecalculatePrice } from "@/features/orcamento/hooks/useRecalculatePrice";
import { VendedorMetricCards } from "@/features/orcamento/components/VendedorMetricCards";
import { VendedorQuoteFilters } from "@/features/orcamento/components/VendedorQuoteFilters";
import { VendedorQuoteRow } from "@/features/orcamento/components/VendedorQuoteRow";
import { VendedorQuoteDetail } from "@/features/orcamento/components/VendedorQuoteDetail";
import { VendedorStatusChangeDialog } from "@/features/orcamento/components/VendedorStatusChangeDialog";

export default function VendedorOrcamentos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { data: allQuotes = [] } = useQuotes();
  const { data: milesTable = [] } = useMilesTable();
  const updateQuote = useUpdateQuote();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [detailQuote, setDetailQuote] = useState(null);
  const [statusChangeQuote, setStatusChangeQuote] = useState(null);
  const [statusChangeTo, setStatusChangeTo] = useState(null);
  const [statusExtra, setStatusExtra] = useState({ emission_date: "", reject_reason: "" });
  const [copied, setCopied] = useState(false);
  const [emissionDialogQuote, setEmissionDialogQuote] = useState(null);
  const [quickEditQuote, setQuickEditQuote] = useState(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  const { quotes, filtered, metrics } = useVendedorOrcamentosFilters({
    allQuotes,
    isAdmin,
    userId: user?.id,
    search,
    statusFilter,
    periodFilter,
    sortBy,
  });

  // Dialogs externos (EmissionDialog/QuickPriceEditDialog) gravam via módulo
  // puro, sem invalidation automática — invalidamos manualmente após salvar.
  const refreshQuotes = () =>
    queryClient.invalidateQueries({ queryKey: qk.quotes.all });

  // Reprecifica um orçamento ainda não congelado usando o preço atual da
  // tabela de milhas. Mantém o valor de venda (acordado com o cliente) e
  // recalcula custo + comissão. Snapshot completo via pricingCalculator.
  const handleRecalculatePrice = useRecalculatePrice({
    updateQuote,
    toast,
    onUpdated: setDetailQuote,
  });

  const openStatusChange = (quote, newStatus) => {
    setStatusChangeQuote(quote);
    setStatusChangeTo(newStatus);
    setStatusExtra({ emission_date: "", reject_reason: "" });
  };

  const confirmStatusChange = async () => {
    if (!statusChangeQuote || !statusChangeTo) return;
    // Mapeia os status (PT) para a coluna de data correta no Supabase (EN).
    const STATUS_DATE_COLUMN = {
      Aprovado: "approved_date",
      Recusado: "rejected_date",
      Emitido: "issued_date",
    };
    const updates = { status: statusChangeTo };
    const dateColumn = STATUS_DATE_COLUMN[statusChangeTo];
    if (dateColumn) updates[dateColumn] = new Date().toISOString();
    if (statusChangeTo === "Recusado" && statusExtra.reject_reason) {
      updates.rejection_reason = statusExtra.reject_reason;
    }
    try {
      await updateQuote.mutateAsync({ id: statusChangeQuote.id, updates });
    } catch {
      return; // Erro já notificado pelo toast central do queryClient.
    }
    toast({ title: `Status atualizado para: ${statusChangeTo}` });
    setStatusChangeQuote(null);
    setStatusChangeTo(null);
  };

  const copyWhatsapp = async (text) => {
    await navigator.clipboard.writeText(text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const regeneratePDF = (quote) => {
    openQuoteInNewTab({
      quote_number: quote.quote_number || `PCD-${quote.id?.slice(0, 5).toUpperCase()}`,
      client: quote.client,
      product: quote.product,
      ticket_type: quote.ticket_type,
      itinerary: quote.itinerary,
      dates: quote.dates,
      passengers: quote.passengers,
      baggage: quote.baggage,
      pricing: quote.pricing,
      additional: quote.additional,
      competitor: quote.competitor,
      services: quote.services,
      total_value: quote.total_value,
      commission: quote.commission,
      seller_name: "Equipe PCD",
      created_date: quote.created_date,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileStack className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Acompanhe o status de todas as cotações geradas
          </p>
        </div>
        <Button onClick={() => navigate("/vendedor/orcamento")} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Cotação
        </Button>
      </div>

      {/* Métricas */}
      <VendedorMetricCards metrics={metrics} />

      {/* Filtros */}
      <VendedorQuoteFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        periodFilter={periodFilter}
        onPeriodFilterChange={setPeriodFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <FileStack className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {quotes.length === 0
                ? "Nenhum orçamento gerado ainda."
                : "Nenhum orçamento encontrado com esses filtros."}
            </p>
            {quotes.length === 0 && (
              <Button
                onClick={() => navigate("/vendedor/orcamento")}
                variant="outline"
                className="mt-4 gap-2"
              >
                <Plus className="h-4 w-4" /> Criar primeira cotação
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => (
            <VendedorQuoteRow
              key={q.id}
              quote={q}
              onView={() => setDetailQuote(q)}
              onMarkRejected={() => openStatusChange(q, "Recusado")}
              onSendToEmission={() => setEmissionDialogQuote(q)}
              onQuickEdit={() => {
                setQuickEditQuote(q);
                setQuickEditOpen(true);
              }}
              onFullEdit={() => navigate(`/vendedor/orcamento?edit=${q.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal de detalhes */}
      <Dialog open={!!detailQuote} onOpenChange={(o) => !o && setDetailQuote(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cotação {detailQuote?.quote_number || `#${detailQuote?.id?.slice(0, 8)}`}
            </DialogTitle>
            <DialogDescription>
              Criada {vendedorTimeAgo(detailQuote?.created_date)} ·{" "}
              <Badge className={cn("ml-1", STATUS_STYLES[detailQuote?.status])}>
                {STATUS_LABELS[detailQuote?.status] || detailQuote?.status}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          {detailQuote && (
            <VendedorQuoteDetail
              quote={detailQuote}
              onCopyWhatsapp={() => copyWhatsapp(detailQuote.whatsapp_text)}
              copied={copied}
              onPDF={() => regeneratePDF(detailQuote)}
              onNewQuoteForClient={() => {
                setDetailQuote(null);
                navigate(`/vendedor/orcamento?from=${detailQuote.id}`);
              }}
              milesTable={milesTable}
              onRecalculatePrice={handleRecalculatePrice}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog enviar para emissão */}
      <EmissionDialog
        quote={emissionDialogQuote}
        open={!!emissionDialogQuote}
        onClose={() => setEmissionDialogQuote(null)}
        onSuccess={() => {
          toast({ title: "Enviado para emissão", description: "A equipe de suporte foi notificada." });
          refreshQuotes();
        }}
      />

      {/* Edição rápida de valores — mantém voos/cliente intactos */}
      <QuickPriceEditDialog
        open={quickEditOpen}
        onOpenChange={(v) => {
          setQuickEditOpen(v);
          if (!v) setQuickEditQuote(null);
        }}
        quote={quickEditQuote}
        onSaved={() => {
          toast({ title: "Valores atualizados" });
          refreshQuotes();
        }}
      />

      {/* Confirmação alteração de status */}
      <VendedorStatusChangeDialog
        statusChangeQuote={statusChangeQuote}
        statusChangeTo={statusChangeTo}
        statusExtra={statusExtra}
        onStatusExtraChange={setStatusExtra}
        onClose={() => setStatusChangeQuote(null)}
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}
