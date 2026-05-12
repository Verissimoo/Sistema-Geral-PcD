import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Award, MessageCircle, FileText, CheckCircle2,
  DollarSign, TrendingUp, Users, Trophy, AlertCircle,
  ChevronRight, BarChart3, Filter, Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { localClient } from "@/api/localClient";
import { CAREER_LEVELS } from "@/lib/careerPlan";
import { getRevenueQuotes } from "@/lib/revenueHelper";
import { computePricingTotals, computeCommission } from "@/lib/pricingCalculator";

const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const STATUS_CONFIG = {
  "Enviado": { label: "Enviado", className: "bg-blue-100 text-blue-800 border-blue-300" },
  "FollowUp Pendente": { label: "⚡ Follow-up", className: "bg-amber-100 text-amber-800 border-amber-400" },
  "FollowUp 1 Enviado": { label: "Follow-up 1", className: "bg-sky-100 text-sky-800 border-sky-300" },
  "FollowUp 2 Enviado": { label: "Follow-up 2", className: "bg-blue-100 text-blue-800 border-blue-300" },
  "FollowUp 3 Enviado": { label: "Follow-up 3", className: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  "Aprovado": { label: "Aprovado", className: "bg-green-100 text-green-800 border-green-300" },
  "Aguardando Emissão": { label: "Aguardando", className: "bg-orange-100 text-orange-800 border-orange-300" },
  "Emitido": { label: "Emitido", className: "bg-purple-100 text-purple-800 border-purple-300" },
  "Recusado": { label: "Recusado", className: "bg-red-100 text-red-800 border-red-300" },
  "Cancelado": { label: "Cancelado", className: "bg-slate-100 text-slate-600 border-slate-300" },
};

function StatusBadge({ status }) {
  const config =
    STATUS_CONFIG[status] || {
      label: status || "—",
      className: "bg-slate-100 text-slate-700 border-slate-300",
    };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// Extrai a rota (origem → destino) de uma cotação considerando segmentos ou trecho legacy.
function getRota(quote) {
  const trecho = quote.itinerary?.trechos?.[0];
  if (!trecho) return "—";
  const seg = trecho.segmentos?.[0] || trecho;
  const origem = seg.origem_iata || "—";
  const destino = seg.destino_iata || "—";
  return `${origem} → ${destino}`;
}

export default function GerenteVendedorDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendedor, setVendedor] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [users, allQuotes, allClients] = await Promise.all([
        localClient.entities.Users.list(),
        localClient.entities.Quotes.list(),
        localClient.entities.Clients.list(),
      ]);
      if (cancelled) return;
      const found = (users || []).find((u) => u.id === id);
      setVendedor(found || null);
      setQuotes((allQuotes || []).filter((q) => q.seller_id === id));
      setClients(allClients || []);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const currentMonth = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const vendidos = useMemo(() => getRevenueQuotes(quotes), [quotes]);

  const cotacoesMes = useMemo(
    () => quotes.filter((q) => q.created_date?.startsWith(currentMonth)),
    [quotes, currentMonth]
  );

  const vendidosMes = useMemo(
    () =>
      vendidos.filter((q) => {
        const d = q.emission_completed_date || q.issued_date || q.created_date;
        return d?.startsWith(currentMonth);
      }),
    [vendidos, currentMonth]
  );

  const receitaMes = vendidosMes.reduce((s, q) => s + (Number(q.total_value) || 0), 0);
  const receitaTotal = vendidos.reduce((s, q) => s + (Number(q.total_value) || 0), 0);

  // Comissão e lucro vêm da fonte única (pricingCalculator). Reotimiza pelo
  // helper em vez de confiar em quote.commission.total — assim, quotes antigos
  // que ainda têm a comissão calculada errada também aparecem corrigidos.
  const comissaoMes = vendidosMes.reduce(
    (s, q) => s + computeCommission(q).total,
    0
  );
  const comissaoTotal = vendidos.reduce(
    (s, q) => s + computeCommission(q).total,
    0
  );
  const lucroMes = vendidosMes.reduce(
    (s, q) => s + computePricingTotals(q).margemBruta,
    0
  );

  const taxaConversaoTotal =
    quotes.length > 0 ? (vendidos.length / quotes.length) * 100 : 0;
  const ticketMedio = vendidos.length > 0 ? receitaTotal / vendidos.length : 0;

  const pipeline = useMemo(
    () => quotes.filter((q) => ["Aprovado", "Aguardando Emissão"].includes(q.status)),
    [quotes]
  );

  const followUpsPendentes = quotes.filter((q) => q.status === "FollowUp Pendente").length;

  const clientesDoVendedor = useMemo(() => {
    const ids = new Set();
    for (const q of quotes) {
      if (q.client?.id) ids.add(q.client.id);
    }
    return clients.filter((c) => ids.has(c.id));
  }, [quotes, clients]);

  const diasAtivo = vendedor?.created_date
    ? Math.floor(
        (Date.now() - new Date(vendedor.created_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;
  const tempoAtivo =
    diasAtivo >= 30
      ? `${Math.floor(diasAtivo / 30)} ${Math.floor(diasAtivo / 30) === 1 ? "mês" : "meses"}`
      : `${diasAtivo} ${diasAtivo === 1 ? "dia" : "dias"}`;

  const idxAtual = vendedor
    ? CAREER_LEVELS.findIndex((l) => l.level === (vendedor.career_level || "N0"))
    : -1;
  const nivelAtual = idxAtual >= 0 ? CAREER_LEVELS[idxAtual] : CAREER_LEVELS[0];
  const fixoMensal = Number(nivelAtual?.fixedSalary) || 0;
  const metaNivel = Number(nivelAtual?.monthlyGoal) || 0;
  const pctMeta = metaNivel > 0 ? Math.min(100, (receitaMes / metaNivel) * 100) : 0;

  // Próximo nível — linear até N5; N5 bifurca, N6A/B são terminais.
  const proximoNivel = useMemo(() => {
    if (idxAtual < 0) return null;
    const cur = CAREER_LEVELS[idxAtual];
    if (!cur || cur.level === "N5" || cur.level === "N6A" || cur.level === "N6B") {
      return null;
    }
    return CAREER_LEVELS[idxAtual + 1] || null;
  }, [idxAtual]);

  const evolucaoMensal = useMemo(() => {
    const n = new Date();
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(n.getFullYear(), n.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const labelRaw = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const cotacoesMesEvo = quotes.filter((q) => q.created_date?.startsWith(monthStr));
      const vendidosMesEvo = vendidos.filter((q) => {
        const dt = q.emission_completed_date || q.issued_date || q.created_date;
        return dt?.startsWith(monthStr);
      });
      const receitaMesEvo = vendidosMesEvo.reduce(
        (s, q) => s + (Number(q.total_value) || 0),
        0
      );
      meses.push({
        label: labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1),
        monthStr,
        cotacoes: cotacoesMesEvo.length,
        vendas: vendidosMesEvo.length,
        receita: receitaMesEvo,
      });
    }
    return meses;
  }, [quotes, vendidos]);

  const topClientes = useMemo(() => {
    const byClient = {};
    for (const q of vendidos) {
      const cid = q.client?.id;
      if (!cid) continue;
      if (!byClient[cid]) {
        byClient[cid] = {
          id: cid,
          name: q.client.name,
          phone: q.client.phone,
          total: 0,
          count: 0,
        };
      }
      byClient[cid].total += Number(q.total_value) || 0;
      byClient[cid].count += 1;
    }
    return Object.values(byClient)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [vendidos]);

  const historicoFiltrado = useMemo(() => {
    let result = [...quotes];
    if (statusFilter !== "all") {
      result = result.filter((q) => q.status === statusFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (q) =>
          q.quote_number?.toLowerCase().includes(s) ||
          q.client?.name?.toLowerCase().includes(s) ||
          q.partner_name?.toLowerCase().includes(s)
      );
    }
    return result.sort(
      (a, b) =>
        new Date(b.created_date || 0).getTime() -
        new Date(a.created_date || 0).getTime()
    );
  }, [quotes, statusFilter, search]);

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Carregando...
      </div>
    );
  }

  if (!vendedor) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="font-semibold mb-2">Vendedor não encontrado</p>
        <p className="text-sm text-muted-foreground mb-4">
          O ID informado não corresponde a nenhum usuário ativo no sistema.
        </p>
        <Button variant="outline" onClick={() => navigate("/gerente/vendedores")}>
          Voltar para a lista
        </Button>
      </div>
    );
  }

  const initials = vendedor.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const maxReceita = Math.max(...evolucaoMensal.map((m) => m.receita), 1);
  const aReceberMes = fixoMensal + comissaoMes;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/gerente/vendedores")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                  {initials}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{vendedor.name}</h1>
                  <p className="text-sm text-slate-300">@{vendedor.username}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge
                      className={
                        vendedor.role === "admin"
                          ? "bg-[#0B1E3D] text-white border-0"
                          : vendedor.role === "gerente"
                            ? "bg-purple-500 text-white border-0"
                            : vendedor.role === "suporte"
                              ? "bg-sky-500 text-white border-0"
                              : "bg-amber-500 text-white border-0"
                      }
                    >
                      {vendedor.role === "admin"
                        ? "Admin"
                        : vendedor.role === "gerente"
                          ? "Gerente"
                          : vendedor.role === "suporte"
                            ? "Suporte"
                            : "Vendedor"}
                    </Badge>
                    <Badge variant="outline" className="text-white border-white/30">
                      <Award className="w-3 h-3 mr-1" />
                      Nível {vendedor.career_level || "N0"} · {nivelAtual?.title || "—"}
                    </Badge>
                    <Badge
                      className={
                        vendedor.status === "Ativo"
                          ? "bg-green-500 text-white border-0"
                          : "bg-slate-500 text-white border-0"
                      }
                    >
                      {vendedor.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="text-right text-sm">
                <p className="text-slate-300">No sistema há</p>
                <p className="text-lg font-bold text-white">{tempoAtivo}</p>
                <p className="text-xs text-slate-400">
                  Desde {formatDate(vendedor.created_date)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── ROW 1: Métricas principais ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-3xl font-black text-slate-900">{quotes.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Cotações totais</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {cotacoesMes.length} este mês
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-black text-slate-900">{vendidos.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Vendas emitidas</p>
            {pipeline.length > 0 && (
              <p className="text-[10px] text-amber-600 font-medium mt-1">
                + {pipeline.length} em pipeline
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">
              {formatBRL(receitaTotal)}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">Receita gerada</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {formatBRL(receitaMes)} no mês
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-3xl font-black text-slate-900">
              {taxaConversaoTotal.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Taxa de conversão
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Ticket {formatBRL(ticketMedio)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center mb-3">
              <Users className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-3xl font-black text-slate-900">
              {clientesDoVendedor.length}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Clientes atendidos
            </p>
            {followUpsPendentes > 0 && (
              <p className="text-[10px] text-amber-600 font-medium mt-1">
                {followUpsPendentes} follow-up pendente
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── ROW 2: Carreira + Financeiro ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Plano de Carreira
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {CAREER_LEVELS.map((level, idx) => {
                const isCurrent = level.level === (vendedor.career_level || "N0");
                const isPast = idxAtual >= 0 && idx < idxAtual;
                return (
                  <div key={level.level} className="flex items-center flex-shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        isCurrent
                          ? "bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-2"
                          : isPast
                            ? "bg-green-500 text-white"
                            : "bg-slate-200 text-slate-500"
                      }`}
                      title={`${level.level} — ${level.title}`}
                    >
                      {level.level}
                    </div>
                    {idx < CAREER_LEVELS.length - 1 && (
                      <div
                        className={`h-0.5 w-6 ${isPast ? "bg-green-500" : "bg-slate-200"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wider text-amber-700 font-bold mb-1">
                Nível atual
              </p>
              <p className="text-xl font-black text-slate-900">
                {nivelAtual?.level} · {nivelAtual?.title || "Vendedor"}
              </p>
              <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Meta mensal</p>
                  <p className="font-bold">
                    {metaNivel > 0 ? formatBRL(metaNivel) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fixo</p>
                  <p className="font-bold">{formatBRL(fixoMensal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progresso</p>
                  <p
                    className={`font-bold ${pctMeta >= 100 ? "text-green-600" : "text-slate-900"}`}
                  >
                    {metaNivel > 0 ? `${pctMeta.toFixed(0)}%` : "—"}
                  </p>
                </div>
              </div>
              {metaNivel > 0 && (
                <div className="w-full bg-white rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className={`h-2 transition-all duration-700 ${
                      pctMeta >= 100 ? "bg-green-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${pctMeta}%` }}
                  />
                </div>
              )}
            </div>

            {proximoNivel && (
              <div className="flex items-center gap-3 text-sm bg-slate-50 rounded-lg p-3">
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Próximo nível</p>
                  <p className="font-semibold">
                    {proximoNivel.level} · Meta{" "}
                    {Number(proximoNivel.monthlyGoal) > 0
                      ? formatBRL(proximoNivel.monthlyGoal)
                      : "a definir"}
                  </p>
                </div>
                {Number(proximoNivel.monthlyGoal) > 0 && (
                  <p className="text-xs text-amber-600 font-medium">
                    Faltam{" "}
                    {formatBRL(
                      Math.max(0, Number(proximoNivel.monthlyGoal) - receitaMes)
                    )}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              A receber no mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-black">{formatBRL(aReceberMes)}</p>
            <div className="space-y-2 pt-3 border-t border-white/20">
              <div className="flex justify-between text-sm">
                <span className="text-amber-50">Fixo</span>
                <span className="font-semibold">{formatBRL(fixoMensal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-50">
                  Comissões ({vendidosMes.length}{" "}
                  {vendidosMes.length === 1 ? "venda" : "vendas"})
                </span>
                <span className="font-semibold">{formatBRL(comissaoMes)}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-white/20">
              <p className="text-xs text-amber-100">Lucro gerado no mês</p>
              <p className="text-lg font-bold">{formatBRL(lucroMes)}</p>
            </div>
            <div className="pt-3 border-t border-white/20">
              <p className="text-xs text-amber-100">Comissão histórica total</p>
              <p className="text-lg font-bold">{formatBRL(comissaoTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── ROW 3: Evolução mensal ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-700" />
            Evolução — últimos 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {evolucaoMensal.map((mes) => {
              const pct = (mes.receita / maxReceita) * 100;
              return (
                <div key={mes.monthStr} className="flex flex-col items-center">
                  <div className="w-full h-32 flex items-end justify-center relative group">
                    <div
                      className="w-12 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-md transition-all hover:from-amber-600 hover:to-amber-500"
                      style={{
                        height: `${Math.max(pct, 2)}%`,
                        minHeight: mes.receita > 0 ? "4px" : "0",
                      }}
                    />
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                      <div className="font-semibold">{formatBRL(mes.receita)}</div>
                      <div className="text-[10px] text-slate-300">
                        {mes.vendas} vendas · {mes.cotacoes} cotações
                      </div>
                    </div>
                  </div>
                  <p className="text-xs font-semibold mt-2">{mes.label}</p>
                  <p className="text-[10px] text-slate-500">
                    {formatBRL(mes.receita)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── ROW 4: Vendas realizadas + Top clientes ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Vendas realizadas
            </CardTitle>
            <Badge variant="outline">{vendidos.length} no total</Badge>
          </CardHeader>
          <CardContent>
            {vendidos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhuma venda emitida ainda.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[...vendidos]
                  .sort(
                    (a, b) =>
                      new Date(
                        b.emission_completed_date || b.issued_date || b.created_date || 0
                      ).getTime() -
                      new Date(
                        a.emission_completed_date || a.issued_date || a.created_date || 0
                      ).getTime()
                  )
                  .slice(0, 10)
                  .map((q) => {
                    const dataEmissao =
                      q.emission_completed_date || q.issued_date || q.created_date;
                    const comissao = computeCommission(q).total;
                    return (
                      <div
                        key={q.id}
                        onClick={() => navigate(`/gerente/orcamentos?id=${q.id}`)}
                        className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {q.quote_number || `#${q.id?.slice(0, 8)}`}
                            </span>
                            <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                              Emitido
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 mt-1 truncate">
                            {q.client?.name || q.partner_name || "—"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {getRota(q)} · {formatDate(dataEmissao)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm">{formatBRL(q.total_value)}</p>
                          {comissao > 0 && (
                            <p className="text-[10px] text-green-600 font-medium">
                              Comissão {formatBRL(comissao)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-500" />
              Top 5 clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClientes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Sem clientes recorrentes ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {topClientes.map((c, idx) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? "bg-amber-100 text-amber-700"
                          : idx === 1
                            ? "bg-slate-200 text-slate-700"
                            : idx === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {c.count} {c.count === 1 ? "venda" : "vendas"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">{formatBRL(c.total)}</p>
                      {c.phone && (
                        <a
                          href={`https://wa.me/${String(c.phone).replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 text-[10px] flex items-center gap-0.5 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── ROW 5: Histórico completo ──────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-700" />
              Histórico de orçamentos
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Buscar PCD ou cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-56 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 h-9">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Enviado">Enviado</SelectItem>
                  <SelectItem value="FollowUp Pendente">Follow-up Pendente</SelectItem>
                  <SelectItem value="FollowUp 1 Enviado">Follow-up 1</SelectItem>
                  <SelectItem value="FollowUp 2 Enviado">Follow-up 2</SelectItem>
                  <SelectItem value="FollowUp 3 Enviado">Follow-up 3</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Aguardando Emissão">Aguardando Emissão</SelectItem>
                  <SelectItem value="Emitido">Emitido</SelectItem>
                  <SelectItem value="Recusado">Recusado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historicoFiltrado.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Nenhum orçamento corresponde aos filtros.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr className="text-left">
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-slate-600">
                      PCD
                    </th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Cliente
                    </th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Rota
                    </th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-slate-600 text-right">
                      Valor
                    </th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                    <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historicoFiltrado.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => navigate(`/gerente/orcamentos?id=${q.id}`)}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-mono text-xs font-bold">
                        {q.quote_number || `#${q.id?.slice(0, 8)}`}
                      </td>
                      <td className="py-3">
                        {q.client?.name || q.partner_name || "—"}
                      </td>
                      <td className="py-3 font-mono text-xs">{getRota(q)}</td>
                      <td className="py-3 text-right font-semibold">
                        {formatBRL(q.total_value)}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        {formatDate(q.created_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
