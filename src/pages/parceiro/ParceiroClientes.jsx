import { useState, useEffect, useMemo } from "react";
import {
  Users, Phone, Mail, Search, FileStack, DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";

const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export default function ParceiroClientes() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      const all = (await localClient.entities.Quotes.list()) || [];
      setQuotes(all.filter((q) => q.partner_id === user.id && q.partner_client_data));
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const clientes = useMemo(() => {
    const map = new Map();
    for (const q of quotes) {
      const data = q.partner_client_data;
      if (!data) continue;
      const key = (data.phone || data.email || data.name || "").toLowerCase().trim();
      if (!key) continue;
      const cur = map.get(key) || {
        name: data.name || "—",
        phone: data.phone || "",
        email: data.email || "",
        quotes: 0,
        total: 0,
      };
      cur.quotes += 1;
      cur.total += Number(q.partner_sale_value) || 0;
      // Mantém o nome mais recente, se vier preenchido
      if (data.name) cur.name = data.name;
      if (data.phone) cur.phone = data.phone;
      if (data.email) cur.email = data.email;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [quotes]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clientes;
    const s = search.trim().toLowerCase();
    return clientes.filter((c) =>
      [c.name, c.phone, c.email].filter(Boolean).some((v) => v.toLowerCase().includes(s))
    );
  }, [clientes, search]);

  const totalMovimentado = clientes.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
            <Users className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Clientes</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Clientes que você já cadastrou ao precificar orçamentos
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Clientes únicos" value={clientes.length} />
        <SummaryCard
          icon={<FileStack className="h-4 w-4 text-blue-600" />}
          label="Orçamentos finalizados"
          value={quotes.length}
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4 text-purple-600" />}
          label="Total movimentado"
          value={formatBRL(totalMovimentado)}
          isCurrency
        />
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {loading && (
          <Card className="border-border/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Carregando...
            </CardContent>
          </Card>
        )}

        {!loading && filtered.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {clientes.length === 0
                ? "Você ainda não cadastrou nenhum cliente. Eles aparecem aqui depois que você precifica um orçamento."
                : "Nenhum cliente encontrado para essa busca."}
            </CardContent>
          </Card>
        )}

        {!loading && filtered.map((c, idx) => (
          <Card key={`${c.phone || c.email || c.name}-${idx}`} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4 flex-wrap">
              <div className="h-11 w-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                {initials(c.name) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3">
                  {c.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </span>
                  )}
                  {c.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {c.email}
                    </span>
                  )}
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100">
                {c.quotes} {c.quotes === 1 ? "orçamento" : "orçamentos"}
              </Badge>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                <div className="text-sm font-bold text-purple-700">{formatBRL(c.total)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, isCurrency }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className={cn("font-bold", isCurrency ? "text-lg" : "text-2xl")}>{value}</div>
      </CardContent>
    </Card>
  );
}
