import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileStack, Search, Plus, Eye, Calendar, DollarSign,
  CheckCircle2, Send, FileText, Copy, Check, Download,
  Clock, XCircle, PlusCircle, AlertTriangle, RefreshCw,
  Edit, FilePlus,
} from "lucide-react";
import QuickPriceEditDialog from "@/components/QuickPriceEditDialog";
import { EmissionDialog } from "@/components/EmissionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { openQuoteInNewTab } from "@/lib/generateQuoteHTML";
import { useAuth } from "@/lib/AuthContext";
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
  Enviado: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  "FollowUp Pendente": "bg-amber-100 text-amber-800 border-amber-400 hover:bg-amber-100 animate-pulse",
  "FollowUp 1 Enviado": "bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-100",
  "FollowUp 2 Enviado": "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100",
  "FollowUp 3 Enviado": "bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-100",
  Aprovado: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  "Aguardando Emissão": "bg-amber-100 text-amber-800 border-amber-400 hover:bg-amber-100",
  Emitido: "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100",
  Recusado: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  Cancelado: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100",
};

const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr) => {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const timeAgo = (iso) => {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const months = Math.floor(d / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

export default function VendedorOrcamentos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [milesTable, setMilesTable] = useState([]);
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

  const reload = async () => {
    const [list, mt] = await Promise.all([
      localClient.entities.Quotes.list(),
      localClient.entities.MilesTable.list(),
    ]);
    // Vendedor enxerga apenas as próprias cotações; admin vê todas.
    const visible = isAdmin ? list : (list || []).filter((q) => q.seller_id === user?.id);
    setQuotes(visible);
    setMilesTable(mt || []);
  };

  // Reprecifica um orçamento ainda não congelado usando o preço atual da
  // tabela de milhas. Mantém o valor de venda (acordado com o cliente) e
  // recalcula custo + comissão. Snapshot completo via pricingCalculator.
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
    // Sincroniza nipon_value snapshot com o cálculo dinâmico (custo × 1.10 ou
    // × 1.0 para Azul). Sem isso, o snapshot fica stale após o recalc.
    const derived = computePricingTotals({ ...quote, pricing: tentativePricing });
    const newPricing = { ...tentativePricing, nipon_value: derived.niponPerPax };
    const newCommission = buildCommissionSnapshot({
      ...quote,
      pricing: newPricing,
    });

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

  useEffect(() => { if (user?.id) reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id, isAdmin]);

  const filtered = useMemo(() => {
    let list = [...quotes];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((x) => x.client?.name?.toLowerCase().includes(q));
    }
    if (statusFilter !== "Todos") {
      list = list.filter((x) => (x.status || "Enviado") === statusFilter);
    }
    if (periodFilter !== "all") {
      const days = periodFilter === "week" ? 7 : 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter((x) => new Date(x.created_date).getTime() >= cutoff);
    }
    if (sortBy === "recent") {
      list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else if (sortBy === "value") {
      list.sort((a, b) => (b.total_value || 0) - (a.total_value || 0));
    } else if (sortBy === "status") {
      list.sort((a, b) => (a.status || "").localeCompare(b.status || ""));
    }
    return list;
  }, [quotes, search, statusFilter, periodFilter, sortBy]);

  const metrics = useMemo(() => {
    const total = quotes.length;
    const enviados = quotes.filter((x) => x.status === "Enviado").length;
    const aprovados = quotes.filter((x) => x.status === "Aprovado").length;
    const valorAprovado = quotes
      .filter((x) => x.status === "Aprovado")
      .reduce((acc, x) => acc + (Number(x.total_value) || 0), 0);
    return { total, enviados, aprovados, valorAprovado };
  }, [quotes]);

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
    await localClient.entities.Quotes.update(statusChangeQuote.id, updates);
    toast({ title: `Status atualizado para: ${statusChangeTo}` });
    setStatusChangeQuote(null);
    setStatusChangeTo(null);
    reload();
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<FileStack className="h-4 w-4" />}
          label="Total de Orçamentos"
          value={metrics.total}
        />
        <MetricCard
          icon={<Send className="h-4 w-4" />}
          label="Enviados"
          value={metrics.enviados}
          color="text-blue-600"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Aprovados"
          value={metrics.aprovados}
          color="text-emerald-600"
        />
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Valor Aprovado"
          value={formatBRL(metrics.valorAprovado)}
          color="text-emerald-600"
          isText
        />
      </div>

      {/* Filtros */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_160px] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os status</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recente</SelectItem>
                <SelectItem value="value">Maior valor</SelectItem>
                <SelectItem value="status">Por status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
            <QuoteRow
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
              Criada {timeAgo(detailQuote?.created_date)} ·{" "}
              <Badge className={cn("ml-1", STATUS_STYLES[detailQuote?.status])}>
                {STATUS_LABELS[detailQuote?.status] || detailQuote?.status}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          {detailQuote && (
            <QuoteDetail
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
          reload();
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
          reload();
        }}
      />

      {/* Confirmação alteração de status */}
      <Dialog
        open={!!statusChangeQuote}
        onOpenChange={(o) => !o && setStatusChangeQuote(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar status</DialogTitle>
            <DialogDescription>
              Mudar de <strong>{statusChangeQuote?.status}</strong> para{" "}
              <strong>{statusChangeTo}</strong>
            </DialogDescription>
          </DialogHeader>
          {statusChangeTo === "Aprovado" && (
            <div className="space-y-2">
              <Label>Data de emissão prevista (opcional)</Label>
              <Input
                type="date"
                value={statusExtra.emission_date}
                onChange={(e) =>
                  setStatusExtra((p) => ({ ...p, emission_date: e.target.value }))
                }
              />
            </div>
          )}
          {statusChangeTo === "Recusado" && (
            <div className="space-y-2">
              <Label>Motivo da recusa (opcional)</Label>
              <Textarea
                rows={3}
                value={statusExtra.reject_reason}
                onChange={(e) =>
                  setStatusExtra((p) => ({ ...p, reject_reason: e.target.value }))
                }
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setStatusChangeQuote(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmStatusChange}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Subcomponentes ────────────────────────────────────────────────

function MetricCard({ icon, label, value, color = "text-foreground", isText }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
          <span className={color}>{icon}</span>
          <span>{label}</span>
        </div>
        <div className={cn("font-bold", isText ? "text-lg" : "text-2xl", color)}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

const FOLLOWUP_STATUSES = [
  "Enviado",
  "FollowUp Pendente",
  "FollowUp 1 Enviado",
  "FollowUp 2 Enviado",
  "FollowUp 3 Enviado",
];

function StatusActionMenu({ quote, onMarkRejected, onSendToEmission }) {
  const isEnviadoOuFollowUp = FOLLOWUP_STATUSES.includes(quote.status);
  const isAprovado = quote.status === "Aprovado";

  const followupTime = useMemo(() => {
    if (!isEnviadoOuFollowUp) return null;
    const refDate = quote.last_followup_date
      ? new Date(quote.last_followup_date)
      : new Date(quote.created_date);
    const hoursSince = (Date.now() - refDate.getTime()) / (1000 * 60 * 60);
    const hoursLeft = Math.max(0, 24 - hoursSince);
    if (hoursLeft === 0) return "Follow-up pendente agora";
    const h = Math.floor(hoursLeft);
    const m = Math.floor((hoursLeft - h) * 60);
    return `Próximo follow-up em ${h}h ${m}min`;
  }, [isEnviadoOuFollowUp, quote.status, quote.last_followup_date, quote.created_date]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex" title="Ações de status">
          <Badge
            className={cn(
              "font-medium border cursor-pointer",
              STATUS_STYLES[quote.status] || STATUS_STYLES.Enviado,
            )}
          >
            {STATUS_LABELS[quote.status] || quote.status || "Enviado"}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="space-y-1">
          {followupTime && (
            <div className="px-3 py-2 text-xs bg-amber-50 border border-amber-200 rounded-md text-amber-800 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" /> {followupTime}
            </div>
          )}

          {isEnviadoOuFollowUp && (
            <>
              <button
                type="button"
                onClick={() => onSendToEmission(quote)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-md flex items-center gap-2 text-blue-700"
              >
                <Send className="h-4 w-4" /> Enviar para Emissão (cliente aprovou)
              </button>
              <button
                type="button"
                onClick={() => onMarkRejected(quote)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 rounded-md flex items-center gap-2 text-red-600"
              >
                <XCircle className="h-4 w-4" /> Marcar como Recusado
              </button>
            </>
          )}

          {isAprovado && (
            <button
              type="button"
              onClick={() => onSendToEmission(quote)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-md flex items-center gap-2 text-blue-700 font-medium"
            >
              <Send className="h-4 w-4" /> Enviar para Emissão
            </button>
          )}

          {["Aguardando Emissão", "Emitido", "Recusado", "Cancelado"].includes(quote.status) && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Sem ações disponíveis neste status
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Status em que a edição rápida não faz sentido (cotação congelada).
const FROZEN_EDIT_STATUSES = new Set(["Emitido", "Cancelado", "Recusado"]);

function QuoteRow({ quote, onView, onMarkRejected, onSendToEmission, onQuickEdit, onFullEdit }) {
  const canEdit = !FROZEN_EDIT_STATUSES.has(quote.status);
  const ida = quote.itinerary?.trechos?.find((t) => t.tipo === "ida")
    || quote.itinerary?.trechos?.[0];
  const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
  const companhia = ida?.companhia || "—";

  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{quote.client?.name || "—"}</span>
              <span className="text-xs text-muted-foreground">
                {quote.client?.phone || ""}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
              <span className="font-mono font-semibold text-foreground">{route}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDateBR(quote.dates?.departure)}
              </span>
              <Badge variant="secondary" className="text-[10px]">{companhia}</Badge>
              <Badge variant="outline" className="text-[10px]">{quote.ticket_type || "Normal"}</Badge>
            </div>
          </div>

          <div className="text-right min-w-[100px]">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-bold text-base">{formatBRL(quote.total_value)}</div>
          </div>

          <StatusActionMenu
            quote={quote}
            onMarkRejected={onMarkRejected}
            onSendToEmission={onSendToEmission}
          />

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {timeAgo(quote.created_date)}
          </span>

          <div className="flex items-center gap-1 justify-end flex-wrap">
            {quote.status === "Emitido" && quote.emission_voucher_url && (
              <a
                href={quote.emission_voucher_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Baixar Voucher
              </a>
            )}
            <Button size="sm" variant="ghost" onClick={onView} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Detalhes
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" disabled={!canEdit} className="gap-1.5">
                  <Edit className="h-3.5 w-3.5" /> Editar
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <button
                  type="button"
                  onClick={() => onQuickEdit?.()}
                  className="w-full text-left p-3 rounded-md hover:bg-amber-50 transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="w-4 h-4 text-amber-600" />
                    <p className="font-semibold text-sm">Atualizar valores</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mudar pontuação, custo, taxa ou venda. Mantém voos e cliente.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onFullEdit?.()}
                  className="w-full text-left p-3 rounded-md hover:bg-blue-50 transition mt-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FilePlus className="w-4 h-4 text-blue-600" />
                    <p className="font-semibold text-sm">Edição completa</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Refazer cotação do zero (mudou voo, destino, cliente etc).
                  </p>
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuoteDetail({
  quote,
  onCopyWhatsapp,
  copied,
  onPDF,
  onNewQuoteForClient,
  milesTable = [],
  onRecalculatePrice,
}) {
  const isParceiroQuote = quote.recipient_type === "parceiro";
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
      {/* Snapshot de preço desatualizado em relação à tabela de milhas atual */}
      {!freshness.isFresh && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900 mb-1">
                Preço da {freshness.programName} mudou desde esta cotação
                {freshness.multipleSegments && ` (e em mais ${freshness.segmentsStale - 1} trecho${freshness.segmentsStale - 1 === 1 ? "" : "s"})`}
              </p>
              <p className="text-sm text-amber-800 mb-2">
                Cotado a <strong>{formatBRL(freshness.usedPrice)}/mil</strong>, hoje custa{" "}
                <strong>{formatBRL(freshness.currentPrice)}/mil</strong>
                <span className={freshness.priceChange > 0 ? "text-red-600" : "text-green-600"}>
                  {" "}
                  ({freshness.priceChange > 0 ? "+" : ""}
                  {formatBRL(freshness.priceChange)}/mil)
                </span>
                .
              </p>
              {isFrozen ? (
                <p className="text-xs text-amber-700">
                  Esta cotação já está no status <strong>{quote.status}</strong> — os valores
                  ficam congelados para auditoria.
                </p>
              ) : freshness.multipleSegments ? (
                <p className="text-xs text-amber-700">
                  Quebra de Trecho com múltiplos programas — a reprecificação precisa ser
                  feita criando uma nova cotação derivada.
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-100"
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

      {/* Cliente */}
      <Section title="Cliente">
        <Field label="Nome" value={quote.client?.name} />
        <Field label="Telefone" value={quote.client?.phone || "—"} />
        <Field label="Origem do lead" value={quote.client?.lead_origin || "—"} />
      </Section>

      {/* Nova cotação para o mesmo cliente */}
      {!isParceiroQuote && onNewQuoteForClient && (
        <Button
          onClick={onNewQuoteForClient}
          variant="outline"
          className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
        >
          <PlusCircle className="h-4 w-4" /> Nova cotação para este cliente
        </Button>
      )}

      {/* Itinerário */}
      <Section title="Itinerário">
        {(quote.itinerary?.trechos || []).map((t, i) => {
          const segs = Array.isArray(t.segmentos) ? t.segmentos : [];
          const hiddenIdx = segs.findIndex((s) => s && s.is_hidden_city_stop);
          const isHidden = hiddenIdx !== -1;
          const destinoReal = isHidden ? segs[hiddenIdx] : null;
          return (
          <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
              <span className="font-medium">{t.companhia} {t.numero_voo}</span>
              {isHidden && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-[10px]">
                  ✈️ Hidden City
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div>
                <div className="font-bold text-base">{t.horario_saida}</div>
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
                <div className={`font-bold text-base ${isHidden ? "line-through text-slate-400" : ""}`}>
                  {t.horario_chegada}
                </div>
                <div className={`text-xs ${isHidden ? "line-through text-slate-400" : "text-muted-foreground"}`}>
                  {t.destino_cidade} ({t.destino_iata})
                </div>
                {isHidden && destinoReal && (
                  <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                    Pax desce em {destinoReal.destino_iata}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Field label="Ida" value={formatDateBR(quote.dates?.departure)} />
          <Field
            label="Volta"
            value={quote.dates?.one_way ? "Somente ida" : formatDateBR(quote.dates?.return)}
          />
          <Field label="Passageiros" value={quote.passengers || 1} />
        </div>
      </Section>

      {/* Precificação — totais já consideram múltiplos passageiros. */}
      <Section title={multiPax ? `Precificação · ${totals.passengers} passageiros` : "Precificação"}>
        <Field
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
            <Field
              label="Milhas"
              value={`${(quote.pricing?.miles_qty || 0).toLocaleString("pt-BR")} mi/pax`}
            />
            <Field
              label="Parte em dinheiro"
              value={`${formatBRL(quote.pricing?.cash_part || 0)}/pax`}
            />
          </>
        )}
        <Field
          label="Custo total"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.costTotal)}</div>
              {renderPerPaxHint(totals.costPerPax)}
            </div>
          }
        />
        <Field
          label="Nipon (mínimo)"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.niponTotal)}</div>
              {renderPerPaxHint(totals.niponPerPax)}
            </div>
          }
        />
        <Field label="Venda" value={formatBRL(totals.saleTotal || quote.total_value)} />
        <Field
          label={`Margem bruta`}
          value={
            <span className={totals.margemBruta >= 0 ? "text-emerald-700" : "text-red-600"}>
              {formatBRL(totals.margemBruta)}
            </span>
          }
        />
        <Field
          label={`Comissão total${commission.isCarteiraPropria ? " · Carteira própria 30%" : ""}`}
          value={formatBRL(commission.total)}
        />
      </Section>

      {/* Serviços */}
      {(quote.services?.insurance?.active || quote.services?.transfer?.active || quote.additional) && (
        <Section title="Serviços e adicionais">
          {quote.services?.insurance?.active && (
            <Field label="Seguro Viagem" value={formatBRL(quote.services.insurance.value)} />
          )}
          {quote.services?.transfer?.active && (
            <Field label="Transfer" value={formatBRL(quote.services.transfer.value)} />
          )}
          {quote.additional && (
            <Field
              label={quote.additional.description || "Adicional"}
              value={formatBRL(quote.additional.value)}
            />
          )}
        </Section>
      )}

      {/* Concorrência */}
      {quote.competitor && (
        <Section title="Concorrência">
          <Field label="Empresa" value={quote.competitor.name} />
          <Field label="Valor" value={formatBRL(quote.competitor.value)} />
          <Field label="Tarifa" value={quote.competitor.fare_type} />
        </Section>
      )}

      {/* Total */}
      <div className="p-4 rounded-lg bg-primary text-primary-foreground flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide opacity-80">Valor total</span>
        <span className="text-2xl font-bold">{formatBRL(quote.total_value)}</span>
      </div>

      {/* WhatsApp */}
      {quote.whatsapp_text && (
        <Section title="Texto WhatsApp">
          <Textarea
            readOnly
            value={quote.whatsapp_text}
            className="min-h-[200px] font-mono text-xs"
          />
          <Button onClick={onCopyWhatsapp} variant="outline" className="gap-2 w-full">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar texto"}
          </Button>
        </Section>
      )}

      <Separator />
      <Button onClick={onPDF} className="w-full bg-[#0D2B6E] hover:bg-[#0A2259] text-white gap-2 h-11">
        <FileText className="h-4 w-4" /> 📄 Baixar PDF
      </Button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
