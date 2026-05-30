import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileStack, Search, Eye, FileText, Download,
  AlertTriangle, Clock, ShoppingCart, DollarSign, TrendingUp, Handshake,
  PlusCircle, RefreshCw, Edit, FilePlus,
} from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import QuickPriceEditDialog from "@/components/QuickPriceEditDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { openQuoteInNewTab } from "@/lib/generateQuoteHTML";
import { CAREER_LEVELS } from "@/lib/careerPlan";
import { computePricingTotals, computeCommission, buildCommissionSnapshot } from "@/lib/pricingCalculator";
import { checkMilesPriceFreshness, FROZEN_STATUSES } from "@/lib/priceFreshness";

const STATUSES = [
  "Enviado",
  "FollowUp Pendente",
  "FollowUp 1 Enviado",
  "FollowUp 2 Enviado",
  "FollowUp 3 Enviado",
  "Aprovado",
  "Aguardando Emissão",
  "Emitido",
  "Recusado",
  "Cancelado",
];

const STATUS_LABELS = {
  Enviado: "Enviado",
  "FollowUp Pendente": "⚡ Follow-up Pendente",
  "FollowUp 1 Enviado": "Follow-up 1 ✓",
  "FollowUp 2 Enviado": "Follow-up 2 ✓",
  "FollowUp 3 Enviado": "Follow-up 3 ✓",
  Aprovado: "Aprovado",
  "Aguardando Emissão": "⏳ Aguardando Emissão",
  Emitido: "✓ Emitido",
  Recusado: "Recusado",
  Cancelado: "Cancelado",
};

const STATUS_STYLES = {
  Enviado: "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10",
  "FollowUp Pendente": "bg-warning/10 text-warning border-warning/30 hover:bg-warning/10 animate-pulse",
  "FollowUp 1 Enviado": "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10",
  "FollowUp 2 Enviado": "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10",
  "FollowUp 3 Enviado": "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10",
  Aprovado: "bg-success/10 text-success border-success/30 hover:bg-success/10",
  "Aguardando Emissão": "bg-warning/10 text-warning border-warning/30 hover:bg-warning/10",
  Emitido: "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10",
  Recusado: "bg-danger/10 text-danger border-danger/30 hover:bg-danger/10",
  Cancelado: "bg-bg-elevated text-text-secondary border-border hover:bg-bg-elevated",
};
const TICKET_TYPES = ["Normal", "Hidden City", "Quebra de Trecho", "Imigração"];
const TICKET_STYLES = {
  Normal: "bg-bg-elevated text-text-secondary border-border",
  "Hidden City": "bg-danger/10 text-danger border-danger/30",
  "Quebra de Trecho": "bg-warning/10 text-warning border-warning/30",
  "Imigração": "bg-accent/10 text-accent border-accent/30",
};

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDateBR = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const timeAgo = (iso) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

export default function GerenteOrcamentos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quotes, setQuotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [milesTable, setMilesTable] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "Todos");
  const [sellerFilter, setSellerFilter] = useState("Todos");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [ticketTypeFilter, setTicketTypeFilter] = useState("Todos");
  const [recipientFilter, setRecipientFilter] = useState("Todos");
  const [detailQuote, setDetailQuote] = useState(null);
  const [quickEditQuote, setQuickEditQuote] = useState(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  const reload = async () => {
    const [quotesList, usersList, mt] = await Promise.all([
      localClient.entities.Quotes.list(),
      localClient.entities.Users.list(),
      localClient.entities.MilesTable.list(),
    ]);
    setQuotes(quotesList || []);
    setUsers(usersList || []);
    setMilesTable(mt || []);
  };
  useEffect(() => { reload(); }, []);

  // Reprecifica usando o preço atual da tabela — só para não-congelados.
  const handleRecalculatePrice = async (quote, freshness) => {
    if (!freshness || freshness.isFresh) return;
    if (FROZEN_STATUSES.has(quote.status)) {
      toast({
        title: "Status congelado",
        description: "Cotações emitidas/canceladas/recusadas não podem ser reprecificadas.",
        variant: "destructive",
      });
      return;
    }
    const ok = window.confirm(
      `Atualizar o preço deste orçamento de ${formatBRL(freshness.usedPrice)}/mil para ${formatBRL(freshness.currentPrice)}/mil?\n\n` +
        "O custo será recalculado, mas o valor de venda ao cliente permanece. Margem e comissão são recalculados."
    );
    if (!ok) return;

    const newCostPerThousand = Number(freshness.currentPrice) || 0;
    const milesQty = Number(quote.pricing?.miles_qty) || 0;
    const newCostBrl = (milesQty / 1000) * newCostPerThousand;
    const tentativePricing = {
      ...(quote.pricing || {}),
      miles_value_per_thousand: newCostPerThousand,
      cost_brl: newCostBrl,
      cost_brl_calc: newCostBrl,
      reprecified_at: new Date().toISOString(),
    };
    const derived = computePricingTotals({ ...quote, pricing: tentativePricing });
    const newPricing = { ...tentativePricing, nipon_value: derived.niponPerPax };
    const newCommission = buildCommissionSnapshot({ ...quote, pricing: newPricing });
    const updated = await localClient.entities.Quotes.update(quote.id, {
      pricing: newPricing,
      commission: newCommission,
    });
    if (!updated) {
      toast({ title: "Erro ao atualizar preço", variant: "destructive" });
      return;
    }
    toast({
      title: "Preço atualizado",
      description: "Custo e comissão recalculados com base na tabela atual.",
    });
    setDetailQuote(updated);
    await reload();
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const sellers = useMemo(
    () => users.filter((u) => u.role === "vendedor"),
    [users]
  );

  const filtered = useMemo(() => {
    let list = [...quotes];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.client?.name?.toLowerCase().includes(q) ||
          x.partner_name?.toLowerCase().includes(q) ||
          x.partner_client_data?.name?.toLowerCase().includes(q) ||
          x.quote_number?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "Todos") {
      list = list.filter((x) => (x.status || "Enviado") === statusFilter);
    }
    if (sellerFilter !== "Todos") {
      list = list.filter((x) => x.seller_id === sellerFilter);
    }
    if (ticketTypeFilter !== "Todos") {
      list = list.filter((x) => (x.ticket_type || "Normal") === ticketTypeFilter);
    }
    if (recipientFilter !== "Todos") {
      list = list.filter((x) => (x.recipient_type || "cliente") === recipientFilter);
    }
    if (periodFilter !== "all") {
      const now = Date.now();
      const cutoffs = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        quarter: 90 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - (cutoffs[periodFilter] || 0);
      list = list.filter((x) => new Date(x.created_date).getTime() >= cutoff);
    }

    list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return list;
  }, [quotes, search, statusFilter, sellerFilter, periodFilter, ticketTypeFilter, recipientFilter]);

  const summary = useMemo(() => {
    const sold = filtered.filter((q) => q.status === "Aprovado" || q.status === "Emitido");
    const totalValue = filtered.reduce((s, q) => s + (q.total_value || 0), 0);
    const revenueSold = sold.reduce((s, q) => s + (q.total_value || 0), 0);
    const avgTicket = sold.length > 0 ? revenueSold / sold.length : 0;
    return {
      total: filtered.length,
      totalValue,
      sold: sold.length,
      revenueSold,
      avgTicket,
    };
  }, [filtered]);

  const pendingOver48h = useMemo(() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    return quotes
      .filter((q) => q.status === "Enviado" && new Date(q.created_date).getTime() < cutoff)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [quotes]);

  const changeStatus = async (quote, newStatus) => {
    const STATUS_DATE_COLUMN = {
      Aprovado: "approved_date",
      Recusado: "rejected_date",
      Emitido: "issued_date",
    };
    const updates = { status: newStatus };
    const dateColumn = STATUS_DATE_COLUMN[newStatus];
    if (dateColumn) updates[dateColumn] = new Date().toISOString();
    await localClient.entities.Quotes.update(quote.id, updates);
    toast({ title: `Status atualizado para: ${newStatus}` });
    reload();
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
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou nº do orçamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os vendedores</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ticketTypeFilter} onValueChange={setTicketTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os tipos</SelectItem>
                {TICKET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={recipientFilter} onValueChange={setRecipientFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os destinatários</SelectItem>
                <SelectItem value="cliente">Cliente Final</SelectItem>
                <SelectItem value="parceiro">Parceiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard
          icon={<FileStack className="h-4 w-4" />}
          label="Total"
          value={summary.total}
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4 text-warning" />}
          label="Valor Total"
          value={formatBRL(summary.totalValue)}
          isText
        />
        <SummaryCard
          icon={<ShoppingCart className="h-4 w-4 text-success" />}
          label="Vendidos"
          value={summary.sold}
          color="text-success"
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4 text-success" />}
          label="Receita Vendida"
          value={formatBRL(summary.revenueSold)}
          isText
          color="text-success"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          label="Ticket Médio"
          value={formatBRL(summary.avgTicket)}
          isText
        />
      </div>

      {/* Pendentes >48h */}
      {pendingOver48h.length > 0 && (
        <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-warning dark:text-warning">
              <AlertTriangle className="h-4 w-4" />
              Orçamentos Pendentes que Requerem Atenção
              <Badge className="bg-warning hover:bg-warning text-white border-0">
                {pendingOver48h.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingOver48h.slice(0, 5).map((q) => {
              const ida =
                q.itinerary?.trechos?.find((t) => t.tipo === "ida") ||
                q.itinerary?.trechos?.[0];
              const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
              return (
                <div
                  key={q.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border flex-wrap"
                >
                  <span className="font-mono text-xs font-bold">{q.quote_number}</span>
                  <span className="text-sm font-medium">{q.client?.name}</span>
                  <span className="text-xs text-muted-foreground">{route}</span>
                  <span className="font-bold text-sm ml-auto">{formatBRL(q.total_value)}</span>
                  <Badge variant="outline" className="gap-1 border-warning/30 text-warning">
                    <Clock className="h-3 w-3" /> Enviado {timeAgo(q.created_date)}
                  </Badge>
                  <Button size="sm" variant="outline" disabled className="gap-1.5 text-xs">
                    Cobrar follow-up
                  </Button>
                </div>
              );
            })}
            {pendingOver48h.length > 5 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                + {pendingOver48h.length - 5} outros pendentes
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                  <QuoteRow
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
              {detailQuote && fmtDateBR(detailQuote.created_date)} ·{" "}
              <Badge className={cn("ml-1 border", STATUS_STYLES[detailQuote?.status])}>
                {STATUS_LABELS[detailQuote?.status] || detailQuote?.status}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          {detailQuote && (
            <QuoteDetail
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
          reload();
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

function SummaryCard({ icon, label, value, color = "text-foreground", isText }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className={cn("font-bold", isText ? "text-lg" : "text-2xl", color)}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// Status em que a edição rápida não faz sentido (cotação congelada).
const FROZEN_EDIT_STATUSES = new Set(["Emitido", "Cancelado", "Recusado"]);

function QuoteRow({ quote, seller, onView, onChangeStatus, onPDF, onClickClient, onQuickEdit, onFullEdit }) {
  const canEdit = !FROZEN_EDIT_STATUSES.has(quote.status);
  const ida =
    quote.itinerary?.trechos?.find((t) => t.tipo === "ida") ||
    quote.itinerary?.trechos?.[0];
  const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
  const companhia = ida?.companhia || "—";
  const levelData = CAREER_LEVELS.find((l) => l.level === seller?.career_level);
  const ticketType = quote.ticket_type || "Normal";

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-bold">{quote.quote_number || "—"}</span>
      </td>
      <td className="px-4 py-3">
        {quote.recipient_type === "parceiro" ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Badge className="bg-accent/10 text-accent border border-accent/30 hover:bg-accent/10 gap-1 text-[10px]">
                <Handshake className="h-3 w-3" /> Parceiro
              </Badge>
              <span className="font-medium text-sm">{quote.partner_name || "—"}</span>
            </div>
            {quote.partner_client_data?.name && (
              <div className="text-xs text-muted-foreground">
                Cliente: {quote.partner_client_data.name}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onClickClient}
            className="text-left hover:text-primary transition-colors"
            title="Ver cliente"
          >
            <div className="font-medium text-sm">{quote.client?.name || "—"}</div>
            <div className="text-xs text-muted-foreground">{quote.client?.phone || ""}</div>
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="font-mono font-semibold text-sm">{route}</div>
        {companhia !== "—" && (
          <Badge variant="secondary" className="text-[10px] mt-1">{companhia}</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{quote.seller_name || "—"}</span>
          {levelData && (
            <Badge
              style={{ background: levelData.color }}
              className="text-white text-[9px] h-4 px-1.5 border-0"
            >
              {seller?.career_level}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge className={cn("border text-[10px]", TICKET_STYLES[ticketType])}>
          {ticketType}
        </Badge>
      </td>
      <td className="px-4 py-3 font-bold text-sm">{formatBRL(quote.total_value)}</td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer">
              <Badge className={cn("font-medium border", STATUS_STYLES[quote.status] || STATUS_STYLES.Enviado)}>
                {STATUS_LABELS[quote.status] || quote.status || "Enviado"}
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Alterar status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUSES
              .filter((s) => s !== quote.status)
              .map((s) => (
                <DropdownMenuItem key={s} onClick={() => onChangeStatus(s)}>
                  {STATUS_LABELS[s] || s}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">{fmtDateBR(quote.created_date)}</div>
        <div className="text-[10px] text-muted-foreground">{timeAgo(quote.created_date)}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={onView} className="gap-1.5 h-8">
            <Eye className="h-3.5 w-3.5" /> Detalhes
          </Button>
          <Button size="sm" variant="ghost" onClick={onPDF} className="gap-1.5 h-8" title="Abrir PDF">
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={!canEdit}
                className="gap-1.5 h-8"
              >
                <Edit className="h-3.5 w-3.5" /> Editar
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-2">
              <button
                type="button"
                onClick={() => onQuickEdit?.()}
                className="w-full text-left p-3 rounded-md hover:bg-warning/10 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4 text-warning" />
                  <p className="font-semibold text-sm">Atualizar valores</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mudar pontuação, custo, taxa ou venda. Mantém voos e cliente.
                </p>
              </button>
              <button
                type="button"
                onClick={() => onFullEdit?.()}
                className="w-full text-left p-3 rounded-md hover:bg-accent/10 transition mt-1"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FilePlus className="w-4 h-4 text-accent" />
                  <p className="font-semibold text-sm">Edição completa</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Refazer cotação do zero (mudou voo, destino, cliente etc).
                </p>
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </td>
    </tr>
  );
}

function QuoteDetail({
  quote,
  onPDF,
  onNewQuoteForClient,
  milesTable = [],
  onRecalculatePrice,
}) {
  const isParceiro = quote.recipient_type === "parceiro";
  const totals = computePricingTotals(quote);
  const commission = computeCommission(quote);
  const multiPax = totals.passengers >= 2;
  const renderPerPaxHint = (perPax) =>
    multiPax ? (
      <div className="text-[10px] text-muted-foreground">
        {formatBRL(perPax)} × {totals.passengers}
      </div>
    ) : null;
  const freshness = useMemo(
    () => checkMilesPriceFreshness(quote, milesTable),
    [quote, milesTable]
  );
  const isFrozen = FROZEN_STATUSES.has(quote.status);
  return (
    <div className="space-y-4 text-sm">
      {!freshness.isFresh && (
        <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-warning mb-1">
                Preço da {freshness.programName} mudou desde esta cotação
                {freshness.multipleSegments &&
                  ` (e em mais ${freshness.segmentsStale - 1} trecho${freshness.segmentsStale - 1 === 1 ? "" : "s"})`}
              </p>
              <p className="text-sm text-warning mb-2">
                Cotado a <strong>{formatBRL(freshness.usedPrice)}/mil</strong>, hoje custa{" "}
                <strong>{formatBRL(freshness.currentPrice)}/mil</strong>
                <span className={freshness.priceChange > 0 ? "text-danger" : "text-success"}>
                  {" "}
                  ({freshness.priceChange > 0 ? "+" : ""}
                  {formatBRL(freshness.priceChange)}/mil)
                </span>
                .
              </p>
              {isFrozen ? (
                <p className="text-xs text-warning">
                  Esta cotação já está em <strong>{quote.status}</strong> — os valores
                  ficam congelados para auditoria.
                </p>
              ) : freshness.multipleSegments ? (
                <p className="text-xs text-warning">
                  Quebra de Trecho com múltiplos programas — a reprecificação precisa ser
                  feita criando uma nova cotação derivada.
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-warning/30 text-warning hover:bg-warning/10"
                  onClick={() => onRecalculatePrice?.(quote, freshness)}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Atualizar preço para o valor atual
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {!isParceiro && onNewQuoteForClient && (
        <Button
          onClick={onNewQuoteForClient}
          variant="outline"
          className="w-full gap-2 border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
        >
          <PlusCircle className="h-4 w-4" /> Nova cotação para este cliente
        </Button>
      )}
      {isParceiro ? (
        <>
          <DetailSection title="Parceiro">
            <DetailRow label="Nome" value={quote.partner_name} />
            {quote.partner_sale_value != null && (
              <DetailRow label="Preço final do parceiro" value={formatBRL(quote.partner_sale_value)} />
            )}
          </DetailSection>
          {quote.partner_client_data && (
            <DetailSection title="Cliente final (cadastrado pelo parceiro)">
              <DetailRow label="Nome" value={quote.partner_client_data.name} />
              <DetailRow label="Telefone" value={quote.partner_client_data.phone || "—"} />
              <DetailRow label="Email" value={quote.partner_client_data.email || "—"} />
            </DetailSection>
          )}
        </>
      ) : (
        <DetailSection title="Cliente">
          <DetailRow label="Nome" value={quote.client?.name} />
          <DetailRow label="Telefone" value={quote.client?.phone || "—"} />
          <DetailRow label="Origem" value={quote.client?.lead_origin || "—"} />
        </DetailSection>
      )}

      <DetailSection title="Vendedor">
        <DetailRow label="Nome" value={quote.seller_name || "—"} />
      </DetailSection>

      <DetailSection title="Itinerário">
        {(quote.itinerary?.trechos || []).map((t, i) => {
          const segs = Array.isArray(t.segmentos) ? t.segmentos : [];
          const hiddenIdx = segs.findIndex((s) => s && s.is_hidden_city_stop);
          const isHidden = hiddenIdx !== -1;
          const destinoReal = isHidden ? segs[hiddenIdx] : null;
          return (
          <div key={i} className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
              <span className="font-medium">{t.companhia} {t.numero_voo}</span>
              {isHidden && (
                <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px]">
                  ✈️ Hidden City
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div>
                <div className="font-bold">{t.horario_saida}</div>
                <div className="text-xs text-muted-foreground">
                  {t.origem_cidade} ({t.origem_iata})
                </div>
              </div>
              <div className="flex-1 text-center text-xs text-muted-foreground">
                {t.duracao}
                {t.escalas > 0 && ` · ${t.escalas} escala em ${t.aeroporto_escala}`}
                {(!t.escalas || t.escalas === 0) && " · direto"}
              </div>
              <div className="text-right">
                <div className={`font-bold ${isHidden ? "line-through text-text-muted" : ""}`}>
                  {t.horario_chegada}
                </div>
                <div className={`text-xs ${isHidden ? "line-through text-text-muted" : "text-muted-foreground"}`}>
                  {t.destino_cidade} ({t.destino_iata})
                </div>
                {isHidden && destinoReal && (
                  <div className="text-[10px] text-accent font-semibold mt-0.5">
                    Pax desce em {destinoReal.destino_iata}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </DetailSection>

      <DetailSection title={multiPax ? `Precificação · ${totals.passengers} passageiros` : "Precificação"}>
        <DetailRow
          label="Tipo"
          value={
            quote.pricing?.type === "milhas"
              ? `Milhas — ${quote.pricing?.program || "—"}`
              : quote.pricing?.type === "milhas_dinheiro"
                ? `Milhas + Dinheiro — ${quote.pricing?.program || quote.pricing?.program_name || "Azul"}`
                : "Dinheiro"
          }
        />
        {quote.pricing?.type === "milhas_dinheiro" && (
          <>
            <DetailRow
              label="Milhas"
              value={`${(quote.pricing?.miles_qty || 0).toLocaleString("pt-BR")} mi/pax`}
            />
            <DetailRow
              label="Parte em dinheiro"
              value={`${formatBRL(quote.pricing?.cash_part || 0)}/pax`}
            />
          </>
        )}
        <DetailRow
          label="Custo total"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.costTotal)}</div>
              {renderPerPaxHint(totals.costPerPax)}
            </div>
          }
        />
        <DetailRow
          label="Nipon (mínimo)"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.niponTotal)}</div>
              {renderPerPaxHint(totals.niponPerPax)}
            </div>
          }
        />
        <DetailRow label="Venda" value={formatBRL(totals.saleTotal || quote.total_value)} />
        <DetailRow
          label="Margem bruta"
          value={
            <span className={totals.margemBruta >= 0 ? "text-success" : "text-danger"}>
              {formatBRL(totals.margemBruta)}
            </span>
          }
        />
        <DetailRow
          label={`Comissão total${commission.isCarteiraPropria ? " · Carteira própria 30%" : ""}`}
          value={formatBRL(commission.total)}
        />
      </DetailSection>

      <Separator />
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary text-primary-foreground">
        <span className="text-xs uppercase opacity-80">Valor total</span>
        <span className="text-xl font-bold">{formatBRL(quote.total_value)}</span>
      </div>

      <Button onClick={onPDF} className="w-full gap-2 bg-[#0D2B6E] hover:bg-[#0A2259] text-white">
        <FileText className="h-4 w-4" /> 📄 Abrir PDF
      </Button>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium text-right text-sm">{value || "—"}</span>
    </div>
  );
}
