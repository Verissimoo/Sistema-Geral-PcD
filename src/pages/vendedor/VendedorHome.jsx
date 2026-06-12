import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, TrendingUp, Target, DollarSign, FileText, CheckCircle2,
  Trophy, Flame, Users, ArrowRight, Calendar, Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/AuthContext";
import { localClient } from "@/api/localClient";
import {
  CULTURA_FRASE_PRINCIPAL, CULTURA_PILARES, TODAS_FRASES, getFraseDoDia,
} from "@/data/culturaPCD";
import { getRevenueQuotes, getMonthRevenue } from "@/lib/revenueHelper";
import { filterCommercialQuotes } from "@/lib/commercialFilter";
import { computeCommission } from "@/lib/pricingCalculator";
import { CAREER_LEVELS } from "@/lib/careerPlan";
import { cn } from "@/lib/utils";

const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function VendedorHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [fraseAtual, setFraseAtual] = useState(() => getFraseDoDia());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      localClient.entities.Quotes.list(),
      localClient.entities.Users.list(),
      localClient.entities.CommercialGoals.list(),
    ])
      .then(([qs, us, gs]) => {
        setQuotes(qs || []);
        setUsers(us || []);
        setGoals(gs || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Frase rotativa: troca a cada 5s.
  useEffect(() => {
    const id = setInterval(() => {
      setFraseAtual((prev) => {
        const idx = TODAS_FRASES.findIndex((f) => f.frase === prev.frase);
        return TODAS_FRASES[(idx + 1) % TODAS_FRASES.length];
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(), []);
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Cotações do vendedor logado
  const minhasCotacoes = useMemo(
    () => quotes.filter((q) => q.seller_id === user?.id),
    [quotes, user?.id],
  );

  const cotacoesMes = useMemo(
    () => minhasCotacoes.filter((q) => q.created_date?.startsWith(currentMonth)),
    [minhasCotacoes, currentMonth],
  );

  // Vendas emitidas no mês (alocadas por data de emissão)
  const vendasMes = useMemo(() => {
    return getRevenueQuotes(minhasCotacoes).filter((q) => {
      const d = q.emission_completed_date || q.issued_date || q.created_date;
      return d?.startsWith(currentMonth);
    });
  }, [minhasCotacoes, currentMonth]);

  const receitaMes = vendasMes.reduce(
    (s, q) => s + (Number(q.total_value) || 0),
    0,
  );
  // Sempre recalcula via helper — quotes antigos podem ter commission.total
  // gravado com a fórmula errada (pré-correção multi-pax).
  const comissaoMes = vendasMes.reduce(
    (s, q) => s + computeCommission(q).total,
    0,
  );

  const nivelAtual = CAREER_LEVELS.find(
    (l) => l.level === (user?.career_level || "N0"),
  );
  const fixoMensal = Number(nivelAtual?.fixedSalary) || 0;
  const totalAReceber = fixoMensal + comissaoMes;

  // Meta pessoal (do nível) + meta da equipe
  const minhaMeta = Number(nivelAtual?.monthlyGoal) || 0;
  const meuPct = minhaMeta > 0 ? Math.min(100, (receitaMes / minhaMeta) * 100) : 0;

  const metaEquipe = goals.find((g) => g.month === currentMonth);
  const commercialQuotes = useMemo(
    () => filterCommercialQuotes(quotes, users),
    [quotes, users],
  );
  const receitaEquipe = useMemo(
    () => getMonthRevenue(commercialQuotes, currentMonth),
    [commercialQuotes, currentMonth],
  );
  const pctEquipe =
    metaEquipe?.monthly_target > 0
      ? Math.min(100, (receitaEquipe / metaEquipe.monthly_target) * 100)
      : 0;

  // Pipeline pessoal (Aprovado + Aguardando) do mês
  const pipelinePessoal = useMemo(
    () =>
      minhasCotacoes.filter(
        (q) =>
          ["Aprovado", "Aguardando Emissão"].includes(q.status) &&
          q.created_date?.startsWith(currentMonth),
      ),
    [minhasCotacoes, currentMonth],
  );
  const pipelineValor = pipelinePessoal.reduce(
    (s, q) => s + (Number(q.total_value) || 0),
    0,
  );

  const followUpsPendentes = useMemo(
    () => minhasCotacoes.filter((q) => q.status === "FollowUp Pendente").length,
    [minhasCotacoes],
  );

  const saudacao = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, [now]);

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Carregando...</div>
    );
  }

  const firstName = (user?.name || "").split(" ")[0] || "vendedor";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header com saudação */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            {saudacao}, {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {now.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Badge className="bg-warning/10 text-warning border-warning/30 px-3 py-1 hover:bg-warning/10">
          <Award className="w-3.5 h-3.5 mr-1.5" />
          Nível {user?.career_level || "N0"} · {nivelAtual?.title || "Vendedor"}
        </Badge>
      </div>

      {/* Bloco de cultura — destaque principal */}
      <Card className="bg-[#0B1E3D] text-white border-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-warning/10 rounded-full blur-3xl -translate-y-32 translate-x-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-32 -translate-x-32 pointer-events-none" />

        <CardContent className="p-8 relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-warning" />
            <span className="text-xs uppercase tracking-wider text-warning font-bold">
              Mentalidade de Vendas PCD
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-semibold mb-5 leading-tight">
            {CULTURA_FRASE_PRINCIPAL}
          </h2>

          {/* Contexto — mensagem principal da cultura */}
          <div className="space-y-3 mb-6 text-text-muted text-sm leading-relaxed max-w-3xl">
            <p>
              Todo vendedor age de acordo com aquilo que{" "}
              <strong className="text-white">acredita sobre si mesmo</strong>. A venda não começa apenas na cotação — ela começa na mentalidade.
            </p>
            <p>
              Se você acredita que vender é difícil, você hesita, não se esforça para encontrar melhores preços, não faz follow-up e interpreta cada orçamento não vendido como prova de que não é um bom vendedor.
            </p>
            <p>
              Se você acredita que vender é um{" "}
              <strong className="text-white">processo simples</strong> e que é um bom vendedor, você fica mais confiante, faz mais contatos, melhora sua comunicação e aumenta suas chances.
            </p>
            <p className="text-warning italic border-l-2 border-warning/30 pl-4 mt-4">
              Na PCD, não acreditamos que venda é sorte. Acreditamos que toda venda é certa, com confiança e método.
            </p>
          </div>

          <div
            key={fraseAtual.frase}
            className="bg-white/10 backdrop-blur border border-white/10 rounded-xl p-5 transition-all animate-fade-in"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{fraseAtual.icon}</span>
              <span className="text-xs uppercase tracking-wider text-text-muted font-semibold">
                {fraseAtual.pilar}
              </span>
            </div>
            <p className="text-lg font-medium text-white">
              &ldquo;{fraseAtual.frase}&rdquo;
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4">
            {CULTURA_PILARES.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  fraseAtual.pilar === p.titulo ? "w-8 bg-warning" : "w-3 bg-bg-surface",
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Minhas métricas — 4 cards */}
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-warning" />
          Minha performance —{" "}
          <span className="capitalize">
            {now.toLocaleDateString("pt-BR", { month: "long" })}
          </span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Cotações */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                {followUpsPendentes > 0 && (
                  <Badge className="bg-warning/10 text-warning border-warning/30 text-xs hover:bg-warning/10">
                    {followUpsPendentes} follow-up{followUpsPendentes > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-semibold text-text-primary">
                {cotacoesMes.length}
              </p>
              <p className="text-xs text-text-muted font-medium mt-1">
                Cotações criadas
              </p>
            </CardContent>
          </Card>

          {/* Vendas emitidas */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </div>
                {pipelinePessoal.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    +{pipelinePessoal.length} pipeline
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-semibold text-text-primary">{vendasMes.length}</p>
              <p className="text-xs text-text-muted font-medium mt-1">
                Vendas emitidas
              </p>
              {pipelineValor > 0 && (
                <p className="text-[10px] text-warning font-medium mt-0.5">
                  Pipeline: {formatBRL(pipelineValor)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Receita gerada */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-warning" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-text-primary">
                {formatBRL(receitaMes)}
              </p>
              <p className="text-xs text-text-muted font-medium mt-1">Receita gerada</p>
            </CardContent>
          </Card>

          {/* Total a receber */}
          <Card className="bg-warning text-white border-0 hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-bg-surface flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-white">
                {formatBRL(totalAReceber)}
              </p>
              <p className="text-xs text-warning font-medium mt-1">
                Total a receber
              </p>
              <p className="text-[10px] text-warning mt-0.5">
                Fixo {formatBRL(fixoMensal)} + comissões {formatBRL(comissaoMes)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Metas: pessoal + equipe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Minha meta */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-warning" />
                Minha meta do mês
              </CardTitle>
              <Badge variant="outline">Nível {user?.career_level || "N0"}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {minhaMeta > 0 ? (
              <>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-semibold text-text-primary">
                    {formatBRL(receitaMes)}
                  </span>
                  <span className="text-sm text-text-muted">
                    de {formatBRL(minhaMeta)}
                  </span>
                </div>
                <div className="w-full bg-bg-elevated rounded-full h-3 overflow-hidden mb-2">
                  <div
                    className={cn(
                      "h-3 rounded-full transition-all duration-700",
                      meuPct >= 100 && "bg-success",
                      meuPct < 100 && meuPct >= 70 && "bg-warning",
                      meuPct < 70 && meuPct >= 30 && "bg-accent",
                      meuPct < 30 && "bg-text-muted",
                    )}
                    style={{ width: `${meuPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span
                    className={cn(
                      "font-bold",
                      meuPct >= 100 ? "text-success" : "text-text-secondary",
                    )}
                  >
                    {meuPct.toFixed(1)}% atingido
                  </span>
                  {meuPct < 100 ? (
                    <span className="text-text-muted">
                      Faltam {formatBRL(minhaMeta - receitaMes)}
                    </span>
                  ) : (
                    <span className="text-success font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      Meta batida!
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma meta definida para seu nível atual.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Meta da equipe */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Meta da equipe —{" "}
              <span className="capitalize">
                {metaEquipe?.month_label ||
                  now.toLocaleDateString("pt-BR", { month: "long" })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metaEquipe ? (
              <>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-semibold text-text-primary">
                    {formatBRL(receitaEquipe)}
                  </span>
                  <span className="text-sm text-text-muted">
                    de {formatBRL(metaEquipe.monthly_target)}
                  </span>
                </div>
                <div className="w-full bg-bg-elevated rounded-full h-3 overflow-hidden mb-2">
                  <div
                    className="bg-accent h-3 rounded-full transition-all duration-700"
                    style={{ width: `${pctEquipe}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-text-secondary">
                    {pctEquipe.toFixed(1)}% atingido
                  </span>
                  <span className="text-text-muted">
                    Juntos somos mais fortes <span aria-hidden>🤝</span>
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sem meta definida para o mês.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ações rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ActionButton
              icon={FileText}
              label="Novo orçamento"
              color="amber"
              onClick={() => navigate("/vendedor/orcamento")}
            />
            <ActionButton
              icon={CheckCircle2}
              label="Meus orçamentos"
              color="blue"
              onClick={() => navigate("/vendedor/orcamentos")}
              badge={followUpsPendentes > 0 ? String(followUpsPendentes) : null}
            />
            <ActionButton
              icon={Trophy}
              label="Plano de carreira"
              color="purple"
              onClick={() => navigate("/vendedor/carreira")}
            />
            <ActionButton
              icon={Calendar}
              label="Ferramentas"
              color="emerald"
              onClick={() => navigate("/vendedor/ferramentas")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActionButton({ icon: Icon, label, color, onClick, badge }) {
  const colors = {
    amber: "hover:bg-warning/10 hover:border-warning/30 group-hover:text-warning",
    blue: "hover:bg-accent/10 hover:border-accent/30 group-hover:text-accent",
    purple: "hover:bg-accent/10 hover:border-accent/30 group-hover:text-accent",
    emerald:
      "hover:bg-success/10 hover:border-success/30 group-hover:text-success",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 p-4 rounded-lg border-2 border-border transition-all relative text-left",
        colors[color],
      )}
    >
      <Icon className="w-5 h-5 text-text-muted transition-colors" />
      <span className="font-medium text-sm text-text-secondary flex-1">{label}</span>
      <ArrowRight className="w-4 h-4 text-text-muted group-hover:translate-x-1 transition-transform" />
      {badge && (
        <span className="absolute -top-2 -right-2 bg-warning text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
}
