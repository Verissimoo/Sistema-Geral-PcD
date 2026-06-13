import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserSearch, Search, MessageCircle, Users, ShoppingCart,
  DollarSign, TrendingUp, Eye, Tag, Plus, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { useToast } from "@/shared/ui/use-toast";
import { cn } from "@/shared/lib/utils";
import {
  useClients, useQuotes, useClientOriginsQuery,
  useCreateClientOrigin, useUpdateClientOrigin, useDeleteClientOrigin,
} from "@/api/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { useClientOrigins, invalidateClientOrigins } from "@/features/clientes/useClientOrigins";
import { ClientOriginBadge } from "@/features/clientes/components/ClientOriginBadge";
import { formatBRL } from "@/shared/lib/format";

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
  const { isAdmin, isGerente } = useAuth();
  const origins = useClientOrigins();
  const { data: clients = [] } = useClients();
  const { data: quotes = [] } = useQuotes();
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [manageOriginsOpen, setManageOriginsOpen] = useState(false);

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
        {(isAdmin || isGerente) && (
          <Button variant="outline" onClick={() => setManageOriginsOpen(true)} className="gap-2">
            <Tag className="h-4 w-4" /> Gerenciar tipos
          </Button>
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Total de Clientes" value={metrics.total} />
        <SummaryCard
          icon={<ShoppingCart className="h-4 w-4 text-success" />}
          label="Que Compraram"
          value={metrics.buyers}
          color="text-success"
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4 text-warning" />}
          label="Receita Total"
          value={formatBRL(metrics.revenue)}
          isText
          color="text-warning"
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

      <ManageOriginsDialog
        open={manageOriginsOpen}
        onOpenChange={setManageOriginsOpen}
      />
    </div>
  );
}

function ManageOriginsDialog({ open, onOpenChange }) {
  const { toast } = useToast();
  const { data: origins = [] } = useClientOriginsQuery();
  const createOrigin = useCreateClientOrigin();
  const updateOrigin = useUpdateClientOrigin();
  const deleteOrigin = useDeleteClientOrigin();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#64748B");
  const [newScope, setNewScope] = useState("geral");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Garante lista fresca ao abrir o dialog (refetch via invalidation)
    if (open) invalidateClientOrigins();
  }, [open]);

  const handleCreate = async () => {
    if (!newLabel.trim() || saving) return;
    setSaving(true);
    try {
      try {
        await createOrigin.mutateAsync({
          label: newLabel.trim(),
          color: newColor,
          scope: newScope,
        });
      } catch {
        return;
      }
      setNewLabel("");
      setNewColor("#64748B");
      setNewScope("geral");
      toast({ title: "Tipo criado" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este tipo? Clientes já cadastrados com ele não serão alterados.")) return;
    try {
      await deleteOrigin.mutateAsync(id);
    } catch {
      return;
    }
    toast({ title: "Tipo excluído" });
  };

  const handleUpdateColor = async (id, color) => {
    try {
      await updateOrigin.mutateAsync({ id, updates: { color } });
    } catch {
      /* toast central já exibe o erro */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Tipos de Cliente</DialogTitle>
          <DialogDescription>
            Carteiras e origens de leads. Tipos com escopo "suporte" aparecem apenas para o time de suporte, admin e gerente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {origins.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-6">
              Nenhum tipo cadastrado.
            </div>
          )}
          {origins.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <input
                  type="color"
                  value={o.color || "#64748B"}
                  onChange={(e) => handleUpdateColor(o.id, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 shrink-0"
                  title="Alterar cor"
                />
                <span className="font-medium truncate">{o.label}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {o.scope === "suporte" ? "🔒 Suporte" : "Geral"}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(o.id)}
                className="text-danger hover:text-danger p-1 shrink-0"
                title="Excluir tipo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-semibold">Novo tipo</p>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Nome</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Carteira do João"
              />
            </div>
            <div>
              <Label className="text-xs">Cor</Label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="block w-10 h-10 rounded cursor-pointer border"
              />
            </div>
            <div>
              <Label className="text-xs">Escopo</Label>
              <Select value={newScope} onValueChange={setNewScope}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={!newLabel.trim() || saving} className="gap-1.5">
              <Plus className="w-4 h-4" /> Criar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClientRow({ client, onView }) {
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
                className="h-6 w-6 rounded-md bg-success/10 hover:bg-success/20 flex items-center justify-center text-success transition-colors"
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
        <ClientOriginBadge origin={client.lead_origin || "Outro"} />
      </td>
      <td className="px-4 py-3 text-sm font-medium">{client.quotesCount}</td>
      <td className="px-4 py-3 text-sm font-bold">
        {client.salesCount > 0 ? (
          <span className="text-success">{client.salesCount}</span>
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
