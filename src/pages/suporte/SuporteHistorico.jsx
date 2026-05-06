import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2, Search, Calendar, DollarSign, Download, FileText, Plane,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { localClient } from "@/api/localClient";

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDateTimeBR = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const formatDateBR = (dateStr) => {
  if (!dateStr) return "—";
  if (dateStr.includes("T")) return new Date(dateStr).toLocaleDateString("pt-BR");
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

export default function SuporteHistorico() {
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const all = (await localClient.entities.Quotes.list()) || [];
      const emitidos = all
        .filter((q) => q.status === "Emitido")
        .sort(
          (a, b) =>
            new Date(b.emission_completed_date || b.issued_date || b.created_date) -
            new Date(a.emission_completed_date || a.issued_date || a.created_date)
        );
      setQuotes(emitidos);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = [...quotes];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.client?.name?.toLowerCase().includes(q) ||
          x.seller_name?.toLowerCase().includes(q) ||
          x.quote_number?.toLowerCase().includes(q)
      );
    }
    if (periodFilter !== "all") {
      const days = periodFilter === "week" ? 7 : periodFilter === "month" ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter((x) => {
        const ref = x.emission_completed_date || x.issued_date || x.created_date;
        return new Date(ref).getTime() >= cutoff;
      });
    }
    return list;
  }, [quotes, search, periodFilter]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const valor = filtered.reduce(
      (s, q) => s + (Number(q.final_paid_value) || Number(q.total_value) || 0),
      0
    );
    return { total, valor };
  }, [filtered]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Histórico Emitido</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Orçamentos emitidos pela equipe de suporte
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
              <span>Total emitidos (no filtro)</span>
            </div>
            <div className="font-bold text-2xl">{summary.total}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span>Valor total emitido</span>
            </div>
            <div className="font-bold text-2xl text-emerald-700">{formatBRL(summary.valor)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, vendedor ou número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="quarter">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {quotes.length === 0
                ? "Nenhum orçamento emitido ainda."
                : "Nenhum orçamento encontrado com esses filtros."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => (
            <HistoricoRow key={q.id} quote={q} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoricoRow({ quote }) {
  const ida = quote.itinerary?.trechos?.find((t) => t.tipo === "ida") || quote.itinerary?.trechos?.[0];
  const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
  const companhia = ida?.companhia || "—";
  const emittedAt = quote.emission_completed_date || quote.issued_date;

  return (
    <Card className="border-border/50 hover:border-purple-300 transition-colors">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {quote.quote_number || `#${quote.id?.slice(0, 8)}`}
              </span>
              <Badge className="bg-purple-100 text-purple-800 border-purple-300 border">
                ✓ Emitido
              </Badge>
            </div>
            <div className="font-bold text-sm">{quote.client?.name || quote.partner_name || "—"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Vendedor: <strong>{quote.seller_name || "—"}</strong>
              {quote.emission_handled_by && (
                <> · Emitido por <strong>{quote.emission_handled_by}</strong></>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
              <span className="font-mono font-semibold">{route}</span>
              <Badge variant="secondary" className="text-[10px]">{companhia}</Badge>
              <span className="text-muted-foreground flex items-center gap-1">
                <Plane className="h-3 w-3" /> {formatDateBR(quote.dates?.departure)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted-foreground">Valor</div>
            <div className="font-bold text-base">
              {formatBRL(quote.final_paid_value || quote.total_value)}
            </div>
          </div>

          <div className="text-right text-xs">
            <div className="text-muted-foreground flex items-center gap-1 justify-end">
              <Calendar className="h-3 w-3" /> Emitido em
            </div>
            <div className="font-semibold">{fmtDateTimeBR(emittedAt)}</div>
          </div>

          {quote.emission_voucher_url && (
            <a
              href={quote.emission_voucher_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              <Download className="h-4 w-4" /> Voucher
            </a>
          )}
        </div>

        {quote.emission_notes && (
          <div className="mt-3 p-2 rounded-lg bg-muted/40 border border-border text-xs">
            <span className="text-muted-foreground">Observações: </span>
            <span>{quote.emission_notes}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
