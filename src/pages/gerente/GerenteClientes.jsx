import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserSearch, Search, MessageCircle, Users, ShoppingCart,
  DollarSign, TrendingUp, Eye, Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";

const ORIGINS = [
  { value: "Marketing (Zenvia)", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "Carteira própria", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "Indicação", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "Instagram", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "Google", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "Outro", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

export default function GerenteClientes() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");

  useEffect(() => {
    setClients(localClient.entities.Clients.list());
    setQuotes(localClient.entities.Quotes.list());
  }, []);

  // Enriquece clientes com dados agregados dos quotes
  const enriched = useMemo(() => {
    return clients.map((c) => {
      const cq = quotes.filter((q) => q.client?.id === c.id);
      const sold = cq.filter((q) => q.status === "Aprovado" || q.status === "Emitido");
      const totalSpent = sold.reduce((s, q) => s + (q.total_value || 0), 0);
      const lastActivity = cq
        .map((q) => q.created_date)
        .sort((a, b) => new Date(b) - new Date(a))[0];
      return {
        ...c,
        quotesCount: cq.length,
        salesCount: sold.length,
        totalSpent,
        lastActivity,
      };
    });
  }, [clients, quotes]);

  const filtered = useMemo(() => {
    let list = [...enriched];
    const term = search.trim().toLowerCase();
    if (term) {
      const digits = onlyDigits(term);
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          (digits && onlyDigits(c.phone || "").includes(digits))
      );
    }
    if (originFilter !== "Todas") {
      list = list.filter((c) => (c.lead_origin || "Outro") === originFilter);
    }
    if (statusFilter === "Com compras") {
      list = list.filter((c) => c.salesCount > 0);
    } else if (statusFilter === "Sem compras") {
      list = list.filter((c) => c.salesCount === 0);
    }
    list.sort(
      (a, b) =>
        new Date(b.lastActivity || 0).getTime() -
        new Date(a.lastActivity || 0).getTime()
    );
    return list;
  }, [enriched, search, originFilter, statusFilter]);

  const metrics = useMemo(() => {
    const total = clients.length;
    const buyers = enriched.filter((c) => c.salesCount > 0);
    const revenue = enriched.reduce((s, c) => s + c.totalSpent, 0);
    const avgTicket = buyers.length > 0 ? revenue / buyers.length : 0;
    return { total, buyers: buyers.length, revenue, avgTicket };
  }, [clients, enriched]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserSearch className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Base de Clientes</h1>
            <Badge variant="outline">
              {clients.length} cliente{clients.length === 1 ? "" : "s"} cadastrado{clients.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Todos os clientes cadastrados e seu histórico de compras
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Total de Clientes" value={metrics.total} />
        <SummaryCard
          icon={<ShoppingCart className="h-4 w-4 text-emerald-600" />}
          label="Que Compraram"
          value={metrics.buyers}
          color="text-emerald-600"
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4 text-amber-600" />}
          label="Receita Total"
          value={formatBRL(metrics.revenue)}
          isText
          color="text-amber-700"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          label="Ticket Médio"
          value={formatBRL(metrics.avgTicket)}
          isText
        />
      </div>

      {/* Filtros */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px] gap-3">
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
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as origens</SelectItem>
                {ORIGINS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os status</SelectItem>
                <SelectItem value="Com compras">Com compras</SelectItem>
                <SelectItem value="Sem compras">Sem compras</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <UserSearch className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {clients.length === 0
                ? "Nenhum cliente cadastrado ainda."
                : "Nenhum cliente encontrado com esses filtros."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <Th>Cliente</Th>
                  <Th>Telefone</Th>
                  <Th>Origem</Th>
                  <Th>Cotações</Th>
                  <Th>Compras</Th>
                  <Th>Total Gasto</Th>
                  <Th>Última Atividade</Th>
                  <Th align="right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <ClientRow key={c.id} client={c} onView={() => navigate(`/gerente/clientes/${c.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function ClientRow({ client, onView }) {
  const origin = ORIGINS.find((o) => o.value === (client.lead_origin || "Outro"));
  const phoneDigits = onlyDigits(client.phone || "");
  const wa = phoneDigits ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : "55" + phoneDigits}` : null;

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{client.name}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {client.phone ? (
          <div className="flex items-center gap-2">
            <span className="text-sm">{client.phone}</span>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="h-6 w-6 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-600 transition-colors"
                title="Abrir WhatsApp"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle className="h-3 w-3" />
              </a>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge className={cn("border", origin?.color)}>
          {client.lead_origin || "Outro"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm font-medium">{client.quotesCount}</td>
      <td className="px-4 py-3 text-sm font-bold">
        {client.salesCount > 0 ? (
          <span className="text-emerald-600">{client.salesCount}</span>
        ) : (
          <span className="text-muted-foreground font-normal">0</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {client.totalSpent > 0 ? (
          <span className="font-bold">{formatBRL(client.totalSpent)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Nenhuma compra</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {timeAgo(client.lastActivity)}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={onView} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Ver histórico
          </Button>
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
