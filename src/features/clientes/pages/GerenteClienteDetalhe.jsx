import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileText, ShoppingCart, DollarSign,
  Calendar, Plane, CheckCircle2, XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { useQuotes, useClient } from "@/api/hooks";
import { formatBRL, formatDateBR, formatDateTimeBR } from "@/shared/lib/format";
import { STATUS_STYLES, onlyDigits, timeAgo } from "../components/clienteDetalheUtils";
import { MetricCard } from "../components/ClienteMetricCard";
import { ClienteDetalheHero } from "../components/ClienteDetalheHero";
import { QuoteFamilies } from "../components/QuoteFamilies";
import { ClienteHistorico } from "../components/ClienteHistorico";
import { ClienteTimeline } from "../components/ClienteTimeline";
import { QuoteDetailContent } from "../components/QuoteDetailContent";

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
      <ClienteDetalheHero client={client} wa={wa} />

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
      <QuoteFamilies families={families} onView={setDetailQuote} />

      {/* Histórico */}
      <ClienteHistorico
        sold={sold}
        others={others}
        totalSpent={totalSpent}
        onView={setDetailQuote}
      />

      {/* Timeline */}
      <ClienteTimeline timeline={timeline} />

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
