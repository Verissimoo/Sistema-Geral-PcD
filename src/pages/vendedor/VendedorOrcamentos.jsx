import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileStack, Search, Plus, Eye, Calendar, DollarSign,
  CheckCircle2, Send, FileText, Copy, Check, MoreVertical,
} from "lucide-react";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { openQuoteInNewTab } from "@/lib/generateQuoteHTML";
import { useAuth } from "@/lib/AuthContext";

const STATUSES = [
  "Enviado",
  "FollowUp Pendente",
  "FollowUp 1 Enviado",
  "FollowUp 2 Enviado",
  "FollowUp 3 Enviado",
  "Aprovado",
  "Recusado",
  "Emitido",
  "Cancelado",
];

const STATUS_LABELS = {
  Enviado: "Enviado",
  "FollowUp Pendente": "⚡ Follow-up Pendente",
  "FollowUp 1 Enviado": "Follow-up 1 ✓",
  "FollowUp 2 Enviado": "Follow-up 2 ✓",
  "FollowUp 3 Enviado": "Follow-up 3 ✓",
  Aprovado: "Aprovado",
  Recusado: "Recusado",
  Emitido: "Emitido",
  Cancelado: "Cancelado",
};

const STATUS_STYLES = {
  Enviado: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  "FollowUp Pendente": "bg-amber-100 text-amber-800 border-amber-400 hover:bg-amber-100 animate-pulse",
  "FollowUp 1 Enviado": "bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-100",
  "FollowUp 2 Enviado": "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100",
  "FollowUp 3 Enviado": "bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-100",
  Aprovado: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  Recusado: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  Emitido: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [detailQuote, setDetailQuote] = useState(null);
  const [statusChangeQuote, setStatusChangeQuote] = useState(null);
  const [statusChangeTo, setStatusChangeTo] = useState(null);
  const [statusExtra, setStatusExtra] = useState({ emission_date: "", reject_reason: "" });
  const [copied, setCopied] = useState(false);

  const reload = async () => {
    const list = (await localClient.entities.Quotes.list()) || [];
    // Vendedor enxerga apenas as próprias cotações; admin vê todas.
    const visible = isAdmin ? list : list.filter((q) => q.seller_id === user?.id);
    setQuotes(visible);
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
              onChangeStatus={(s) => openStatusChange(q, s)}
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
            />
          )}
        </DialogContent>
      </Dialog>

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

function QuoteRow({ quote, onView, onChangeStatus }) {
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

          <Badge className={cn("font-medium border", STATUS_STYLES[quote.status] || STATUS_STYLES.Enviado)}>
            {STATUS_LABELS[quote.status] || quote.status || "Enviado"}
          </Badge>

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {timeAgo(quote.created_date)}
          </span>

          <div className="flex items-center gap-1 justify-end">
            <Button size="sm" variant="ghost" onClick={onView} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Detalhes
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Alterar status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {STATUSES.filter((s) => s !== quote.status).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => onChangeStatus(s)}>
                    {STATUS_LABELS[s] || s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuoteDetail({ quote, onCopyWhatsapp, copied, onPDF }) {
  return (
    <div className="space-y-4 text-sm">
      {/* Cliente */}
      <Section title="Cliente">
        <Field label="Nome" value={quote.client?.name} />
        <Field label="Telefone" value={quote.client?.phone || "—"} />
        <Field label="Origem do lead" value={quote.client?.lead_origin || "—"} />
      </Section>

      {/* Itinerário */}
      <Section title="Itinerário">
        {(quote.itinerary?.trechos || []).map((t, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
              <span className="font-medium">{t.companhia} {t.numero_voo}</span>
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
                <div className="font-bold text-base">{t.horario_chegada}</div>
                <div className="text-xs text-muted-foreground">
                  {t.destino_cidade} ({t.destino_iata})
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Field label="Ida" value={formatDateBR(quote.dates?.departure)} />
          <Field
            label="Volta"
            value={quote.dates?.one_way ? "Somente ida" : formatDateBR(quote.dates?.return)}
          />
          <Field label="Passageiros" value={quote.passengers || 1} />
        </div>
      </Section>

      {/* Precificação */}
      <Section title="Precificação">
        <Field
          label="Tipo"
          value={quote.pricing?.type === "milhas" ? `Milhas — ${quote.pricing?.program || "—"}` : "Dinheiro"}
        />
        <Field label="Custo" value={formatBRL(quote.pricing?.cost_brl)} />
        <Field label="Taxa" value={formatBRL(quote.pricing?.tax)} />
        <Field label="Nipon (mínimo)" value={formatBRL(quote.pricing?.nipon_value)} />
        <Field label="Venda" value={formatBRL(quote.pricing?.sale_value)} />
        <Field label="Comissão total" value={formatBRL(quote.commission?.total)} />
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
