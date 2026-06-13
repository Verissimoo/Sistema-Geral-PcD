import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileStack, Download } from "lucide-react";
import QuickPriceEditDialog from "@/shared/components/QuickPriceEditDialog";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { useToast } from "@/shared/ui/use-toast";
import { cn } from "@/shared/lib/utils";
import { useQuotes, useUsers, useMilesTable, useUpdateQuote } from "@/api/hooks";
import { qk } from "@/api/queryKeys";
import { openQuoteInNewTab } from "@/features/orcamento/lib/generateQuoteHTML";
import { formatDateBR } from "@/shared/lib/format";
import { STATUS_LABELS, STATUS_STYLES } from "@/features/orcamento/lib/quoteStatus";
import { useGerenteOrcamentosFilters } from "@/features/orcamento/hooks/useGerenteOrcamentosFilters";
import { useRecalculatePrice } from "@/features/orcamento/hooks/useRecalculatePrice";
import { GerenteQuoteFilters } from "@/features/orcamento/components/GerenteQuoteFilters";
import { GerenteSummaryCards } from "@/features/orcamento/components/GerenteSummaryCards";
import { GerentePendingAlert } from "@/features/orcamento/components/GerentePendingAlert";
import { GerenteQuoteRow } from "@/features/orcamento/components/GerenteQuoteRow";
import { GerenteQuoteDetail } from "@/features/orcamento/components/GerenteQuoteDetail";

export default function GerenteOrcamentos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const { data: quotes = [] } = useQuotes();
  const { data: users = [] } = useUsers();
  const { data: milesTable = [] } = useMilesTable();
  const updateQuote = useUpdateQuote();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "Todos");
  const [sellerFilter, setSellerFilter] = useState("Todos");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [ticketTypeFilter, setTicketTypeFilter] = useState("Todos");
  const [recipientFilter, setRecipientFilter] = useState("Todos");
  const [detailQuote, setDetailQuote] = useState(null);
  const [quickEditQuote, setQuickEditQuote] = useState(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  // Reprecifica usando o preço atual da tabela — só para não-congelados.
  const handleRecalculatePrice = useRecalculatePrice({
    updateQuote,
    toast,
    onUpdated: setDetailQuote,
  });

  // Sincroniza statusFilter no querystring
  useEffect(() => {
    if (statusFilter === "Todos") {
      if (searchParams.get("status")) {
        const next = new URLSearchParams(searchParams);
        next.delete("status");
        setSearchParams(next, { replace: true });
      }
    } else if (searchParams.get("status") !== statusFilter) {
      const next = new URLSearchParams(searchParams);
      next.set("status", statusFilter);
      setSearchParams(next, { replace: true });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionalmente estreitas (efeito de sync); incluir as faltantes mudaria comportamento
  }, [statusFilter]);

  const { sellers, filtered, summary, pendingOver48h } = useGerenteOrcamentosFilters({
    quotes,
    users,
    search,
    statusFilter,
    sellerFilter,
    periodFilter,
    ticketTypeFilter,
    recipientFilter,
  });

  const changeStatus = async (quote, newStatus) => {
    const STATUS_DATE_COLUMN = {
      Aprovado: "approved_date",
      Recusado: "rejected_date",
      Emitido: "issued_date",
    };
    const updates = { status: newStatus };
    const dateColumn = STATUS_DATE_COLUMN[newStatus];
    if (dateColumn) updates[dateColumn] = new Date().toISOString();
    try {
      await updateQuote.mutateAsync({ id: quote.id, updates });
    } catch {
      // Toast de erro central já exibido pelo queryClient
      return;
    }
    toast({ title: `Status atualizado para: ${newStatus}` });
  };

  const exportPDF = (quote) => {
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
      seller_name: quote.seller_name || "Equipe PCD",
      created_date: quote.created_date,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileStack className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Central de Orçamentos</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Visão gerencial de todas as cotações da agência
          </p>
        </div>
        <Button variant="outline" disabled className="gap-2">
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </div>

      {/* Filtros */}
      <GerenteQuoteFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sellerFilter={sellerFilter}
        onSellerFilterChange={setSellerFilter}
        sellers={sellers}
        periodFilter={periodFilter}
        onPeriodFilterChange={setPeriodFilter}
        ticketTypeFilter={ticketTypeFilter}
        onTicketTypeFilterChange={setTicketTypeFilter}
        recipientFilter={recipientFilter}
        onRecipientFilterChange={setRecipientFilter}
      />

      {/* Resumo */}
      <GerenteSummaryCards summary={summary} />

      {/* Pendentes >48h */}
      <GerentePendingAlert pendingOver48h={pendingOver48h} />

      {/* Tabela */}
      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <FileStack className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {quotes.length === 0
                ? "Nenhum orçamento gerado ainda."
                : "Nenhum orçamento encontrado com esses filtros."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Nº</Th>
                  <Th>Para</Th>
                  <Th>Rota</Th>
                  <Th>Vendedor</Th>
                  <Th>Tipo</Th>
                  <Th>Valor</Th>
                  <Th>Status</Th>
                  <Th>Data</Th>
                  <Th align="right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <GerenteQuoteRow
                    key={q.id}
                    quote={q}
                    seller={users.find((u) => u.id === q.seller_id)}
                    onView={() => setDetailQuote(q)}
                    onChangeStatus={(s) => changeStatus(q, s)}
                    onPDF={() => exportPDF(q)}
                    onClickClient={() =>
                      q.client?.id && navigate(`/gerente/clientes/${q.client.id}`)
                    }
                    onQuickEdit={() => {
                      setQuickEditQuote(q);
                      setQuickEditOpen(true);
                    }}
                    onFullEdit={() => navigate(`/vendedor/orcamento?edit=${q.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialog detalhes */}
      <Dialog open={!!detailQuote} onOpenChange={(o) => !o && setDetailQuote(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailQuote?.quote_number}</DialogTitle>
            <DialogDescription>
              {detailQuote?.recipient_type === "parceiro"
                ? `Parceiro: ${detailQuote?.partner_name || "—"}`
                : detailQuote?.client?.name}
              {" · "}
              {detailQuote && formatDateBR(detailQuote.created_date)} ·{" "}
              <Badge className={cn("ml-1 border", STATUS_STYLES[detailQuote?.status])}>
                {STATUS_LABELS[detailQuote?.status] || detailQuote?.status}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          {detailQuote && (
            <GerenteQuoteDetail
              quote={detailQuote}
              onPDF={() => exportPDF(detailQuote)}
              onNewQuoteForClient={() => {
                const target = detailQuote;
                setDetailQuote(null);
                navigate(`/vendedor/orcamento?from=${target.id}`);
              }}
              milesTable={milesTable}
              onRecalculatePrice={handleRecalculatePrice}
            />
          )}
        </DialogContent>
      </Dialog>

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
          // O dialog salva via localClient (fora da camada react-query) —
          // invalida o cache para refletir os novos valores.
          queryClient.invalidateQueries({ queryKey: qk.quotes.all });
        }}
      />
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-3",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}
