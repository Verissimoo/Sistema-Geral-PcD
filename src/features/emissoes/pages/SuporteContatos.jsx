import { useState, useMemo } from "react";
import {
  Users, Search, MessageCircle, Phone,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { useQuotes, useClients } from "@/api/hooks";
import { useClientOrigins } from "@/features/clientes/useClientOrigins";
import { ClientOriginBadge } from "@/features/clientes/components/ClientOriginBadge";
import { formatBRL } from "@/shared/lib/format";

const onlyDigits = (s = "") => s.replace(/\D/g, "");

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

const timeAgo = (ts) => {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d}d`;
  return new Date(ts).toLocaleDateString("pt-BR");
};

export default function SuporteContatos() {
  const origins = useClientOrigins();
  const { data: clients = [] } = useClients();
  const { data: quotes = [] } = useQuotes();
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState("all");

  const enriched = useMemo(() => {
    return clients.map((c) => {
      const myQuotes = quotes.filter(
        (q) => q.client?.id === c.id || q.client_id === c.id
      );
      const compras = myQuotes.filter((q) =>
        ["Aprovado", "Emitido", "Aguardando Emissão"].includes(q.status)
      );
      const totalGasto = compras.reduce((s, q) => s + (q.total_value || 0), 0);
      const lastActivity = myQuotes.length > 0
        ? Math.max(...myQuotes.map((q) => new Date(q.created_date).getTime()))
        : null;
      return {
        ...c,
        total_quotes: myQuotes.length,
        total_purchases: compras.length,
        total_spent: totalGasto,
        last_activity: lastActivity,
      };
    });
  }, [clients, quotes]);

  const filtered = useMemo(() => {
    return enriched
      .filter((c) => {
        if (originFilter !== "all" && (c.lead_origin || "Outro") !== originFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const phoneDigits = onlyDigits(c.phone || "");
          const searchDigits = onlyDigits(search);
          if (
            !c.name?.toLowerCase().includes(q) &&
            !(searchDigits && phoneDigits.includes(searchDigits))
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => (b.last_activity || 0) - (a.last_activity || 0));
  }, [enriched, search, originFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Contatos do Sistema</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Todos os clientes cadastrados — {clients.length} contato{clients.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {origins.map((o) => (
                  <SelectItem key={o.id} value={o.label}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: o.color || "#94A3B8" }}
                      />
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {clients.length === 0
                ? "Nenhum contato cadastrado ainda."
                : "Nenhum contato encontrado com esses filtros."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <Th>Cliente</Th>
                  <Th>Telefone</Th>
                  <Th>Tipo</Th>
                  <Th align="right">Cotações</Th>
                  <Th align="right">Compras</Th>
                  <Th align="right">Total Gasto</Th>
                  <Th>Última atividade</Th>
                  <Th align="center">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <ContactRow key={c.id} client={c} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function ContactRow({ client }) {
  const phoneDigits = onlyDigits(client.phone || "");
  const wa = phoneDigits
    ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : "55" + phoneDigits}`
    : null;

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{client.name || "—"}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {client.phone ? (
          <span className="font-mono text-xs">{client.phone}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <ClientOriginBadge origin={client.lead_origin || "Outro"} />
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium">{client.total_quotes}</td>
      <td className="px-4 py-3 text-right text-sm font-bold">
        {client.total_purchases > 0 ? (
          <span className="text-success">{client.total_purchases}</span>
        ) : (
          <span className="text-muted-foreground font-normal">0</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold">
        {client.total_spent > 0 ? formatBRL(client.total_spent) : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(client.last_activity)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 rounded-md bg-success/10 hover:bg-success/20 flex items-center justify-center text-success transition-colors"
              title="Abrir WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="h-8 w-8 rounded-md bg-accent/10 hover:bg-accent/20 flex items-center justify-center text-accent transition-colors"
              title="Ligar"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-3",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
      )}
    >
      {children}
    </th>
  );
}
