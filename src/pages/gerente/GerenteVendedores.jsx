import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Trophy, Calendar, Eye, ArrowUpDown, Crown, Medal,
  TrendingUp, DollarSign, ShoppingCart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { CAREER_LEVELS } from "@/lib/careerPlan";

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

const SORT_FIELDS = {
  receita: (a, b) => b.receita - a.receita,
  vendas: (a, b) => b.vendas - a.vendas,
  cotacoes: (a, b) => b.cotacoes - a.cotacoes,
  conversao: (a, b) => b.conversao - a.conversao,
  lucro: (a, b) => b.lucro - a.lucro,
  ticket: (a, b) => b.ticketMedio - a.ticketMedio,
  nome: (a, b) => (a.user.name || "").localeCompare(b.user.name || ""),
};

export default function GerenteVendedores() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [periodo, setPeriodo] = useState("30");
  const [periodoCustom, setPeriodoCustom] = useState({ start: "", end: "" });
  const [sortBy, setSortBy] = useState("receita");

  useEffect(() => {
    (async () => {
      const [usersList, quotesList] = await Promise.all([
        localClient.entities.Users.list(),
        localClient.entities.Quotes.list(),
      ]);
      setUsers(usersList || []);
      setQuotes(quotesList || []);
    })();
  }, []);

  const periodRange = useMemo(() => {
    const now = new Date();
    if (periodo === "custom") {
      const start = periodoCustom.start
        ? new Date(periodoCustom.start + "T00:00:00")
        : new Date(0);
      const end = periodoCustom.end
        ? new Date(periodoCustom.end + "T23:59:59")
        : now;
      return { start, end };
    }
    const days = parseInt(periodo);
    const start = new Date(now);
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }, [periodo, periodoCustom]);

  const filteredQuotes = useMemo(
    () =>
      quotes.filter((q) => {
        const d = new Date(q.created_date);
        return d >= periodRange.start && d <= periodRange.end;
      }),
    [quotes, periodRange]
  );

  const sellers = useMemo(
    () => users.filter((u) => u.role === "vendedor"),
    [users]
  );

  const rows = useMemo(() => {
    return sellers.map((user) => {
      const userQuotes = filteredQuotes.filter((q) => q.seller_id === user.id);
      const vendidos = userQuotes.filter(
        (q) => q.status === "Aprovado" || q.status === "Emitido"
      );
      const receita = vendidos.reduce((s, q) => s + (q.total_value || 0), 0);
      const lucro = vendidos.reduce((s, q) => {
        const cost = Number(q.pricing?.cost_brl) || 0;
        const tax = Number(q.pricing?.tax) || 0;
        const custoTotal = cost + tax;
        // Se não há custo registrado, estima 85% do total como custo
        const custoEstimado = custoTotal > 0 ? custoTotal : (q.total_value || 0) * 0.85;
        return s + ((q.total_value || 0) - custoEstimado);
      }, 0);
      const cotacoes = userQuotes.length;
      const vendas = vendidos.length;
      const conversao = cotacoes > 0 ? Number(((vendas / cotacoes) * 100).toFixed(1)) : 0;
      const ticketMedio = vendas > 0 ? receita / vendas : 0;

      const diasAtivo = Math.floor(
        (Date.now() - new Date(user.created_date || 0).getTime()) / 86400000
      );
      const tempoAtivo =
        diasAtivo >= 30
          ? `${Math.floor(diasAtivo / 30)} ${Math.floor(diasAtivo / 30) === 1 ? "mês" : "meses"}`
          : `${Math.max(0, diasAtivo)} dias`;

      return {
        user,
        cotacoes,
        vendas,
        conversao,
        receita,
        lucro,
        ticketMedio,
        tempoAtivo,
        margem: receita > 0 ? Number(((lucro / receita) * 100).toFixed(1)) : 0,
      };
    });
  }, [sellers, filteredQuotes]);

  const sorted = useMemo(
    () => [...rows].sort(SORT_FIELDS[sortBy] || SORT_FIELDS.receita),
    [rows, sortBy]
  );

  const summary = useMemo(() => {
    const ativos = sellers.filter((s) => s.status === "Ativo").length;
    const totalVendas = rows.reduce((s, r) => s + r.vendas, 0);
    const totalReceita = rows.reduce((s, r) => s + r.receita, 0);
    const ticketMedio = totalVendas > 0 ? totalReceita / totalVendas : 0;
    return { ativos, totalVendas, totalReceita, ticketMedio };
  }, [sellers, rows]);

  const podium = useMemo(() => {
    const top3 = [...rows]
      .filter((r) => r.receita > 0)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 3);
    return top3.length >= 3 ? top3 : null;
  }, [rows]);

  const conversaoMax = useMemo(
    () => Math.max(0, ...rows.map((r) => r.conversao)),
    [rows]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Painel de Vendedores</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Performance consolidada da equipe comercial
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Último mês</SelectItem>
              <SelectItem value="90">Último trimestre</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {periodo === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={periodoCustom.start}
                onChange={(e) =>
                  setPeriodoCustom((p) => ({ ...p, start: e.target.value }))
                }
                className="w-[140px]"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={periodoCustom.end}
                onChange={(e) =>
                  setPeriodoCustom((p) => ({ ...p, end: e.target.value }))
                }
                className="w-[140px]"
              />
            </div>
          )}
        </div>
      </div>

      {sellers.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center space-y-3">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhum vendedor cadastrado</p>
            <Button onClick={() => navigate("/usuarios")} variant="outline" className="gap-1.5">
              Cadastrar vendedor →
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              icon={<Users className="h-4 w-4" />}
              label="Vendedores Ativos"
              value={summary.ativos}
            />
            <SummaryCard
              icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
              label="Receita do Período"
              value={formatBRL(summary.totalReceita)}
              isText
              color="text-emerald-700"
            />
            <SummaryCard
              icon={<ShoppingCart className="h-4 w-4 text-blue-600" />}
              label="Total de Vendas"
              value={summary.totalVendas}
              color="text-blue-600"
            />
            <SummaryCard
              icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
              label="Ticket Médio"
              value={formatBRL(summary.ticketMedio)}
              isText
              color="text-amber-700"
            />
          </div>

          {/* Tabela */}
          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <Th>#</Th>
                    <SortableTh field="nome" sortBy={sortBy} setSortBy={setSortBy}>Vendedor</SortableTh>
                    <Th>Nível</Th>
                    <SortableTh field="cotacoes" sortBy={sortBy} setSortBy={setSortBy}>Cotações</SortableTh>
                    <SortableTh field="vendas" sortBy={sortBy} setSortBy={setSortBy}>Vendas</SortableTh>
                    <SortableTh field="conversao" sortBy={sortBy} setSortBy={setSortBy}>Conversão</SortableTh>
                    <SortableTh field="receita" sortBy={sortBy} setSortBy={setSortBy}>Receita</SortableTh>
                    <SortableTh field="lucro" sortBy={sortBy} setSortBy={setSortBy}>Lucro</SortableTh>
                    <SortableTh field="ticket" sortBy={sortBy} setSortBy={setSortBy}>Ticket Médio</SortableTh>
                    <Th>Ativo há</Th>
                    <Th align="right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, idx) => (
                    <SellerRow
                      key={row.user.id}
                      pos={idx + 1}
                      row={row}
                      onView={() => navigate(`/gerente/vendedores/${row.user.id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Podium */}
          {podium && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" /> Pódio do Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 items-end">
                  <PodiumCard place={2} row={podium[1]} />
                  <PodiumCard place={1} row={podium[0]} />
                  <PodiumCard place={3} row={podium[2]} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparativo de conversão */}
          {rows.some((r) => r.cotacoes > 0) && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Taxa de Conversão por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rows
                  .filter((r) => r.cotacoes > 0)
                  .sort((a, b) => b.conversao - a.conversao)
                  .map((r) => {
                    const pct = conversaoMax > 0
                      ? (r.conversao / conversaoMax) * 100
                      : 0;
                    const colorClass =
                      r.conversao >= 30
                        ? "bg-emerald-500"
                        : r.conversao >= 15
                        ? "bg-amber-500"
                        : "bg-red-500";
                    return (
                      <div key={r.user.id} className="flex items-center gap-3">
                        <div className="w-32 text-sm font-medium truncate shrink-0">
                          {r.user.name}
                        </div>
                        <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-500", colorClass)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-16 text-right text-sm font-bold">
                          {r.conversao}%
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Subcomponentes ────────────────────────────────────────────────

function Th({ children, align = "left" }) {
  return (
    <th
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-3",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

function SortableTh({ children, field, sortBy, setSortBy }) {
  const active = sortBy === field;
  return (
    <th
      onClick={() => setSortBy(field)}
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-3 text-left cursor-pointer select-none hover:bg-muted/60 transition-colors",
        active && "text-foreground"
      )}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn("h-3 w-3", active && "text-primary")} />
      </div>
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

function SellerRow({ pos, row, onView }) {
  const levelData = CAREER_LEVELS.find((l) => l.level === (row.user.career_level || "N0"));
  const conversaoColor =
    row.conversao >= 30
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : row.conversao >= 15
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";
  const margemColor =
    row.margem >= 15
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <td className="px-3 py-3 text-sm font-bold text-muted-foreground">{pos}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#0B1E3D] text-white flex items-center justify-center font-bold text-xs shrink-0">
            {initials(row.user.name)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{row.user.name}</div>
            <Badge
              className={cn(
                "text-[9px] h-4 px-1.5 border-0 mt-0.5",
                row.user.status === "Ativo"
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                  : "bg-red-100 text-red-700 hover:bg-red-100"
              )}
            >
              {row.user.status || "—"}
            </Badge>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        {levelData ? (
          <div>
            <Badge style={{ background: levelData.color }} className="text-white border-0">
              {levelData.level}
            </Badge>
            <div className="text-[10px] text-muted-foreground mt-1">{levelData.title}</div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-sm font-medium">{row.cotacoes}</td>
      <td className="px-3 py-3 text-sm font-bold">
        {row.vendas > 0 ? <span className="text-emerald-700">{row.vendas}</span> : "0"}
      </td>
      <td className="px-3 py-3">
        <Badge className={cn("border", conversaoColor)}>{row.conversao}%</Badge>
      </td>
      <td className="px-3 py-3 text-sm font-bold">{formatBRL(row.receita)}</td>
      <td className="px-3 py-3">
        <div>
          <div className="text-sm font-semibold">{formatBRL(row.lucro)}</div>
          {row.receita > 0 && (
            <Badge className={cn("border text-[9px] mt-0.5", margemColor)}>
              {row.margem}%
            </Badge>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-sm">{formatBRL(row.ticketMedio)}</td>
      <td className="px-3 py-3 text-xs text-muted-foreground">{row.tempoAtivo}</td>
      <td className="px-3 py-3">
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={onView} className="gap-1.5 h-8">
            <Eye className="h-3.5 w-3.5" /> Detalhes
          </Button>
        </div>
      </td>
    </tr>
  );
}

function PodiumCard({ place, row }) {
  if (!row) return <div />;
  const config = {
    1: { Icon: Trophy, color: "#F59E0B", border: "border-amber-400", bg: "from-amber-50 to-amber-100/40", height: "h-44", label: "1º Lugar" },
    2: { Icon: Medal, color: "#9CA3AF", border: "border-gray-400", bg: "from-gray-50 to-gray-100/40", height: "h-36", label: "2º Lugar" },
    3: { Icon: Medal, color: "#CD7F32", border: "border-orange-700", bg: "from-orange-50 to-orange-100/40", height: "h-32", label: "3º Lugar" },
  }[place];
  const { Icon, color, border, bg, height, label } = config;

  return (
    <Card
      className={cn(
        "border-2 transition-all bg-gradient-to-br shadow-md",
        border,
        bg,
        height,
        "flex flex-col justify-between"
      )}
    >
      <CardContent className="p-4 flex flex-col items-center text-center justify-between flex-1 gap-2">
        <Icon className="h-7 w-7" style={{ color }} />
        <div className="font-bold text-xs uppercase tracking-widest" style={{ color }}>
          {label}
        </div>
        <div className="font-bold text-sm truncate w-full">{row.user.name}</div>
        <div className="text-base font-extrabold">{formatBRL(row.receita)}</div>
        <div className="text-[10px] text-muted-foreground">{row.vendas} vendas</div>
      </CardContent>
    </Card>
  );
}
