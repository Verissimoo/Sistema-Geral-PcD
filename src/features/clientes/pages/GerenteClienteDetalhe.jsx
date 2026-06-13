import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MessageCircle, FileText, ShoppingCart, DollarSign,
  Clock, Eye, Calendar, Plane, CheckCircle2, XCircle,
  FileStack, GitBranch,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { useQuotes, useClient } from "@/api/hooks";
import { ClientOriginBadge } from "@/features/clientes/components/ClientOriginBadge";
import { computePricingTotals } from "@/shared/lib/pricingCalculator";
import { formatBRL, formatDateBR, formatDateTimeBR } from "@/shared/lib/format";

const STATUS_STYLES = {
  Enviado: "bg-accent/10 text-accent border-accent/30",
  Aprovado: "bg-success/10 text-success border-success/30",
  "Aguardando Emissão": "bg-warning/10 text-warning border-warning/30",
  Emitido: "bg-accent/10 text-accent border-accent/30",
  Recusado: "bg-danger/10 text-danger border-danger/30",
  Cancelado: "bg-bg-elevated text-text-secondary border-border",
};

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

const onlyDigits = (s = "") => s.replace(/\D/g, "");

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
  const months = Math.floor(d / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

export default function GerenteClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: allQuotes = [] } = useQuotes();
  // useClient retorna null para "não encontrado" (não é erro)
  const { data: clientFromStore, isLoading: clientLoading } = useClient(id);
  const [detailQuote, setDetailQuote] = useState(null);

  // Fallback: extrai dos quotes se cliente não estiver mais no store
  const client = useMemo(() => {
    if (clientFromStore) return clientFromStore;
    if (clientLoading) return null;
    const fromQuote = allQuotes.find(
      (q) => q.client?.id === id || q.client_id === id
    );
    if (fromQuote?.client) return { ...fromQuote.client, id };
    return null;
  }, [clientFromStore, clientLoading, allQuotes, id]);

  const quotes = useMemo(
    () =>
      allQuotes.filter(
        (q) => q.client?.id === id || q.client_id === id
      ),
    [allQuotes, id]
  );

  const sold = useMemo(
    () => quotes.filter((q) => q.status === "Aprovado" || q.status === "Emitido"),
    [quotes]
  );
  const others = useMemo(
    () => quotes.filter((q) => q.status !== "Aprovado" && q.status !== "Emitido"),
    [quotes]
  );

  // Agrupa cotações em "famílias": uma cotação-raiz + suas derivadas (parent_quote_id apontando pra ela)
  const families = useMemo(() => {
    const map = new Map();
    quotes.forEach((q) => {
      const headId = q.parent_quote_id || q.id;
      if (!map.has(headId)) map.set(headId, { headId, head: null, items: [] });
      const entry = map.get(headId);
      entry.items.push(q);
      if (!q.parent_quote_id) entry.head = q;
    });
    return Array.from(map.values())
      .filter((f) => f.items.length > 1) // só famílias com pelo menos 2 cotações
      .map((f) => ({
        ...f,
        head: f.head || f.items[0],
        items: [...f.items].sort(
          (a, b) => new Date(a.created_date) - new Date(b.created_date)
        ),
      }))
      .sort((a, b) => new Date(b.items[0].created_date) - new Date(a.items[0].created_date));
  }, [quotes]);

  const totalSpent = sold.reduce((s, q) => s + (q.total_value || 0), 0);
  const avgTicket = sold.length > 0 ? totalSpent / sold.length : 0;
  const pending = quotes.filter((q) => q.status === "Enviado").length;
  const firstQuoteDate = useMemo(() => {
    const dates = quotes
      .map((q) => q.created_date)
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b));
    return dates[0] || null;
  }, [quotes]);

  // Timeline construída a partir dos quotes + status changes.
  // (declarada antes do early-return para respeitar as rules-of-hooks;
  // depende só de `quotes`, então o resultado é idêntico.)
  const timeline = useMemo(() => {
    const events = [];
    quotes.forEach((q) => {
      events.push({
        type: "create",
        date: q.created_date,
        quote: q,
        text: `Cotação criada — ${q.quote_number || "—"}`,
        sub: `${formatBRL(q.total_value)} · ${q.seller_name || "—"}`,
        icon: FileText,
        color: "text-accent",
        bg: "bg-accent/10",
      });
      const statusFields = [
        { f: "approved_date", label: "Aprovado", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
        { f: "issued_date", label: "Emitido", icon: Plane, color: "text-accent", bg: "bg-accent/10" },
        { f: "rejected_date", label: "Recusado", icon: XCircle, color: "text-danger", bg: "bg-danger/10" },
      ];
      statusFields.forEach((sf) => {
        if (q[sf.f]) {
          events.push({
            type: "status",
            date: q[sf.f],
            quote: q,
            text: `${q.quote_number || ""} marcado como ${sf.label}`,
            sub: formatBRL(q.total_value),
            icon: sf.icon,
            color: sf.color,
            bg: sf.bg,
          });
        }
      });
    });
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return events;
  }, [quotes]);

  if (!client) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/gerente/clientes")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card className="border-border/50">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Cliente não encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const phoneDigits = onlyDigits(client.phone || "");
  const wa = phoneDigits
    ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : "55" + phoneDigits}`
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header voltar */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/gerente/clientes")}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" /> Clientes
        </Button>
        <div className="text-xs text-muted-foreground mt-1">
          Clientes / <span className="text-foreground">{client.name}</span>
        </div>
      </div>

      {/* Hero do cliente */}
      <Card className="border-border/50">
        <CardContent className="p-5 flex items-center gap-4 flex-wrap">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xl text-primary shrink-0">
            {initials(client.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">{client.phone || "—"}</span>
              <ClientOriginBadge origin={client.lead_origin || "Outro"} />
            </div>
          </div>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2 bg-success hover:bg-success">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </a>
          )}
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Total Gasto"
          value={formatBRL(totalSpent)}
          subtext={`Em ${sold.length} ${sold.length === 1 ? "compra" : "compras"}`}
          color="text-success"
        />
        <MetricCard
          icon={<ShoppingCart className="h-4 w-4" />}
          label="Ticket Médio"
          value={formatBRL(avgTicket)}
          subtext={sold.length > 0 ? "Por compra" : "Sem compras"}
          color="text-warning"
        />
        <MetricCard
          icon={<FileText className="h-4 w-4" />}
          label="Cotações Recebidas"
          value={quotes.length}
          subtext={`${pending} pendente${pending === 1 ? "" : "s"}`}
          color="text-accent"
        />
        <MetricCard
          icon={<Calendar className="h-4 w-4" />}
          label="Cliente Desde"
          value={firstQuoteDate ? formatDateBR(firstQuoteDate) : "—"}
          subtext={firstQuoteDate ? timeAgo(firstQuoteDate) : "—"}
          color="text-primary"
        />
      </div>

      {/* Famílias de cotações (cotação derivada do mesmo cliente) */}
      {families.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Famílias de Cotações
          </h2>
          {families.map((family) => (
            <Card key={family.headId} className="border-l-4 border-l-amber-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-warning" />
                  Histórico — {family.items.length} cotações
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Primeira em {formatDateBR(family.head.created_date)}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {family.items.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-bg-elevated cursor-pointer transition-colors"
                    onClick={() => setDetailQuote(q)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-warning/10 text-warning text-xs font-bold flex items-center justify-center">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{q.quote_number}</p>
                        <p className="text-xs text-muted-foreground">{formatDateBR(q.created_date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatBRL(q.total_value)}</p>
                      <Badge className={cn("text-[10px] border mt-1", STATUS_STYLES[q.status])}>
                        {q.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Histórico */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Histórico Completo
        </h2>

        {/* Compras realizadas */}
        <Card className="border-success/30 bg-success/10 dark:bg-success/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-success dark:text-success">
              <CheckCircle2 className="h-4 w-4" /> Compras Realizadas ·{" "}
              <span className="font-normal">
                {sold.length} {sold.length === 1 ? "compra" : "compras"} · Total: {formatBRL(totalSpent)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sold.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Este cliente ainda não fechou nenhuma compra.
              </div>
            ) : (
              sold.map((q) => <QuoteRow key={q.id} quote={q} onView={() => setDetailQuote(q)} />)
            )}
          </CardContent>
        </Card>

        {/* Outras */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileStack className="h-4 w-4 text-muted-foreground" />
              Cotações Pendentes / Outros Status ·{" "}
              <span className="font-normal text-muted-foreground">
                {others.length} {others.length === 1 ? "cotação" : "cotações"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {others.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Sem cotações em outros status.
              </div>
            ) : (
              others.map((q) => <QuoteRow key={q.id} quote={q} onView={() => setDetailQuote(q)} />)
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Linha do tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              Nenhuma atividade registrada para este cliente.
            </div>
          ) : (
            <div className="relative pl-8">
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
              <div className="space-y-3">
                {timeline.map((ev, i) => {
                  const Icon = ev.icon;
                  return (
                    <div key={i} className="relative">
                      <div
                        className={cn(
                          "absolute -left-[20px] top-1 h-7 w-7 rounded-full flex items-center justify-center border-4 border-card",
                          ev.bg
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", ev.color)} />
                      </div>
                      <div className="ml-2 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="text-sm font-medium">{ev.text}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{ev.sub}</div>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTimeBR(ev.date)} · {timeAgo(ev.date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog detalhes */}
      <Dialog open={!!detailQuote} onOpenChange={(o) => !o && setDetailQuote(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailQuote?.quote_number || "Orçamento"}
            </DialogTitle>
            <DialogDescription>
              Criado em {formatDateTimeBR(detailQuote?.created_date)} ·{" "}
              <Badge className={cn("ml-1 border", STATUS_STYLES[detailQuote?.status])}>
                {detailQuote?.status}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          {detailQuote && <QuoteDetailContent quote={detailQuote} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ icon, label, value, subtext, color }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className={color}>{icon}</span>
          <span>{label}</span>
        </div>
        <div className={cn("font-bold text-lg", color)}>{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtext}</div>
      </CardContent>
    </Card>
  );
}

function QuoteRow({ quote, onView }) {
  const ida =
    quote.itinerary?.trechos?.find((t) => t.tipo === "ida") ||
    quote.itinerary?.trechos?.[0];
  const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
  const companhia = ida?.companhia || "—";

  return (
    <div className="p-3 rounded-lg border border-border bg-card flex items-center gap-3 flex-wrap hover:border-primary/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold">{quote.quote_number || "—"}</span>
          <span className="text-sm font-semibold">{route}</span>
          <Badge variant="secondary" className="text-[10px]">{companhia}</Badge>
          <Badge variant="outline" className="text-[10px]">{quote.ticket_type || "Normal"}</Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {quote.seller_name || "—"} · {formatDateBR(quote.created_date)} · {timeAgo(quote.created_date)}
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-sm">{formatBRL(quote.total_value)}</div>
        <Badge className={cn("text-[10px] border mt-1", STATUS_STYLES[quote.status])}>
          {quote.status}
        </Badge>
      </div>
      <Button size="sm" variant="ghost" onClick={onView} className="gap-1.5">
        <Eye className="h-3.5 w-3.5" /> Detalhes
      </Button>
    </div>
  );
}

function QuoteDetailContent({ quote }) {
  const totals = computePricingTotals(quote);
  const multiPax = totals.passengers >= 2;
  const renderPerPaxHint = (perPax) =>
    multiPax ? (
      <div className="text-[10px] text-muted-foreground">
        {formatBRL(perPax)} × {totals.passengers}
      </div>
    ) : null;
  return (
    <div className="space-y-4 text-sm">
      <Section title="Cliente">
        <Row label="Nome" value={quote.client?.name} />
        <Row label="Telefone" value={quote.client?.phone || "—"} />
        <Row label="Origem" value={quote.client?.lead_origin || "—"} />
      </Section>

      <Section title="Itinerário">
        {(quote.itinerary?.trechos || []).map((t, i) => (
          <div key={i} className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
              <span className="font-medium">{t.companhia} {t.numero_voo}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
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
                <div className="font-bold">{t.horario_chegada}</div>
                <div className="text-xs text-muted-foreground">
                  {t.destino_cidade} ({t.destino_iata})
                </div>
              </div>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Precificação">
        <Row label="Tipo" value={quote.pricing?.type === "milhas" ? `Milhas — ${quote.pricing?.program || "—"}` : quote.pricing?.type === "milhas_dinheiro" ? `Milhas + Dinheiro — ${quote.pricing?.program || quote.pricing?.program_name || "Azul"}` : "Dinheiro"} />
        <Row
          label="Custo total"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.costTotal)}</div>
              {renderPerPaxHint(totals.costPerPax)}
            </div>
          }
        />
        <Row
          label="Nipon (mínimo)"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.niponTotal)}</div>
              {renderPerPaxHint(totals.niponPerPax)}
            </div>
          }
        />
        <Row label="Venda" value={formatBRL(totals.saleTotal || quote.total_value)} />
      </Section>

      <Separator />
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary text-primary-foreground">
        <span className="text-xs uppercase opacity-80">Valor total</span>
        <span className="text-xl font-bold">{formatBRL(quote.total_value)}</span>
      </div>
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

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
