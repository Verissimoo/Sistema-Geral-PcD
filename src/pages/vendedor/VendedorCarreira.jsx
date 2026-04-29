import { useState, useEffect, useMemo } from "react";
import {
  Trophy, TrendingUp, Target, DollarSign, Clock, ChevronRight,
  Award, Star, Check, CircleDot, Map, Table as TableIcon,
  Users, Sparkles, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { localClient } from "@/api/localClient";
import {
  CAREER_LEVELS, getSellerStats, getCurrentLevel, getNextLevel,
  getBonusTier, getBonusValue,
} from "@/lib/careerPlan";

const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtMonth = (label) => label.charAt(0).toUpperCase() + label.slice(1);

export default function VendedorCarreira() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [selectedSellerId, setSelectedSellerId] = useState(null);

  useEffect(() => {
    setUsers(localClient.entities.Users.list());
    setQuotes(localClient.entities.Quotes.list());
  }, []);

  const sellersList = useMemo(
    () => users.filter((u) => u.role === "vendedor"),
    [users]
  );

  // Vendedor: o próprio user. Admin: o vendedor selecionado (se houver).
  const sellerId = isAdmin ? selectedSellerId : user?.id;
  const seller = useMemo(() => {
    if (!sellerId) return null;
    if (!isAdmin) {
      return {
        id: user.id,
        name: user.name,
        career_level: users.find((u) => u.id === user.id)?.career_level || "N0",
      };
    }
    return users.find((u) => u.id === sellerId);
  }, [sellerId, isAdmin, user, users]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Plano de Carreira</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Acompanhe seu progresso, metas e evolução rumo ao próximo nível
        </p>
      </div>

      <Tabs defaultValue="progresso" className="space-y-6">
        <TabsList>
          <TabsTrigger value="progresso" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Meu Progresso
          </TabsTrigger>
          <TabsTrigger value="mapa" className="gap-2">
            <Map className="h-4 w-4" /> Mapa de Carreira
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progresso" className="space-y-6">
          {isAdmin && (
            <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-500/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Você está logado como administrador. Selecione um vendedor
                    para ver o progresso dele.
                  </span>
                </div>
                <Select
                  value={selectedSellerId || ""}
                  onValueChange={(v) => setSelectedSellerId(v)}
                >
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="Selecione um vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sellersList.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-muted-foreground">
                        Nenhum vendedor cadastrado
                      </div>
                    ) : (
                      sellersList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} · {s.career_level || "N0"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {seller ? (
            <ProgressView seller={seller} quotes={quotes} />
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {isAdmin
                    ? "Selecione um vendedor acima para ver o progresso."
                    : "Carregando seus dados..."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mapa" className="space-y-6">
          <CareerMap currentLevelCode={isAdmin ? null : (seller?.career_level || "N0")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Aba: Meu Progresso ─────────────────────────────────────────────
function ProgressView({ seller, quotes }) {
  const stats = useMemo(() => getSellerStats(seller.id, quotes), [seller.id, quotes]);
  const currentLevel = useMemo(() => getCurrentLevel(seller), [seller]);
  const nextLevel = useMemo(() => getNextLevel(currentLevel), [currentLevel]);

  const bonusTier = getBonusTier(stats.monthlyRevenue, currentLevel.monthlyGoal);
  const bonusValue = getBonusValue(currentLevel, bonusTier);
  const monthlyPct = currentLevel.monthlyGoal
    ? Math.min(100, (stats.monthlyRevenue / currentLevel.monthlyGoal) * 100)
    : 0;
  const weeklyPct = currentLevel.weeklyGoal
    ? Math.min(100, (stats.weeklyRevenue / currentLevel.weeklyGoal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <HeroLevel currentLevel={currentLevel} nextLevel={nextLevel} sellerName={seller.name} />

      {/* Métricas do mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Receita Mensal"
          value={formatBRL(stats.monthlyRevenue)}
          color="text-emerald-600"
        />
        <MetricCard
          icon={<Target className="h-4 w-4" />}
          label="Meta Mensal"
          value={formatBRL(currentLevel.monthlyGoal)}
          color="text-primary"
          progress={monthlyPct}
          progressLabel={`${monthlyPct.toFixed(0)}% atingido`}
        />
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Receita Semanal"
          value={formatBRL(stats.weeklyRevenue)}
          color="text-emerald-600"
        />
        <MetricCard
          icon={<Target className="h-4 w-4" />}
          label="Meta Semanal"
          value={currentLevel.weeklyGoalLabel}
          color="text-primary"
          progress={weeklyPct}
          progressLabel={`${weeklyPct.toFixed(0)}% atingido`}
        />
      </div>

      {/* Bônus */}
      {currentLevel.bonus100 !== null ? (
        <BonusTiers level={currentLevel} tier={bonusTier} bonusValue={bonusValue} />
      ) : (
        <Card className="border-border/50 bg-muted/20">
          <CardContent className="p-5 text-sm text-muted-foreground text-center">
            Estrutura de bônus deste nível ainda em definição.
          </CardContent>
        </Card>
      )}

      {/* Remuneração */}
      <RemunerationCard level={currentLevel} bonusValue={bonusValue} />

      {/* Progresso para próximo nível */}
      {currentLevel.level === "N5" ? (
        <BifurcationCard />
      ) : nextLevel ? (
        <NextLevelCard
          currentLevel={currentLevel}
          nextLevel={nextLevel}
          monthlyRevenue={stats.monthlyRevenue}
        />
      ) : (
        <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
          <CardContent className="p-5 text-sm text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
            <Trophy className="h-5 w-5 text-emerald-600 shrink-0" />
            Você atingiu o topo do plano de carreira atual.
          </CardContent>
        </Card>
      )}

      {/* Histórico mensal */}
      <HistoryCards history={stats.monthlyHistory} level={currentLevel} />
    </div>
  );
}

function HeroLevel({ currentLevel, nextLevel, sellerName }) {
  const c = currentLevel.color;
  return (
    <Card className="border-0 overflow-hidden">
      <CardContent
        className="p-6 md:p-8 text-white"
        style={{ background: `linear-gradient(135deg, ${c} 0%, ${shade(c, -25)} 100%)` }}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex-1">
            <div className="text-xs uppercase tracking-[0.3em] opacity-80 mb-2 font-bold">
              {sellerName}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Badge
                className="bg-white/20 hover:bg-white/20 text-white border-white/30 text-xs font-bold"
              >
                {currentLevel.level}
              </Badge>
              <span className="text-xs uppercase tracking-widest opacity-70">
                {currentLevel.minTime}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
              {currentLevel.title}
            </h2>
            <p className="text-sm opacity-80 max-w-xl">{currentLevel.description}</p>
          </div>
          {nextLevel && (
            <div className="bg-[#0B1E3D] rounded-lg p-4 min-w-[200px]">
              <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1 font-semibold">
                Próximo nível
              </div>
              <div className="font-bold text-amber-400">
                {nextLevel.level}
              </div>
              <div className="text-sm font-semibold">
                {nextLevel.title}
              </div>
              <div className="text-xs text-white/60 mt-1">
                Meta {formatBRL(nextLevel.monthlyGoal)}/mês
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ icon, label, value, color, progress, progressLabel }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className={color}>{icon}</span>
          <span>{label}</span>
        </div>
        <div className={cn("font-bold text-xl", color)}>{value}</div>
        {typeof progress === "number" && (
          <div className="mt-2 space-y-1">
            <Progress value={progress} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground">{progressLabel}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BonusTiers({ level, tier, bonusValue }) {
  const tiers = [
    { key: "100%", label: "Atingir meta", value: level.bonus100, color: "emerald" },
    { key: "150%", label: "1,5× a meta", value: level.bonus150, color: "amber" },
    { key: "200%", label: "2× a meta", value: level.bonus200, color: "yellow" },
  ];
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" /> Bônus por desempenho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {tiers.map((t) => {
            const reached = tier && parseInt(tier) >= parseInt(t.key);
            return (
              <div
                key={t.key}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  reached
                    ? t.color === "emerald" && "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 shadow-md shadow-emerald-500/20"
                    : "border-border bg-muted/30",
                  reached && t.color === "amber" && "border-amber-400 bg-amber-50 dark:bg-amber-500/10 shadow-md shadow-amber-500/20",
                  reached && t.color === "yellow" && "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 shadow-md shadow-yellow-500/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold",
                      reached && "border-current"
                    )}
                  >
                    {t.key}
                  </Badge>
                  {reached && <Sparkles className={cn("h-3.5 w-3.5", t.color === "emerald" && "text-emerald-600", t.color === "amber" && "text-amber-600", t.color === "yellow" && "text-yellow-600")} />}
                </div>
                <div className="text-xs text-muted-foreground">{t.label}</div>
                <div className="text-lg font-bold mt-1">+ {formatBRL(t.value)}</div>
              </div>
            );
          })}
        </div>
        <div
          className={cn(
            "p-3 rounded-lg text-sm flex items-center gap-2 border",
            tier
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-muted/40 border-border text-muted-foreground"
          )}
        >
          {tier ? (
            <>
              <Trophy className="h-4 w-4 text-emerald-600" />
              <span>
                Seu bônus este mês: <strong>{formatBRL(bonusValue)}</strong> ({tier} da meta)
              </span>
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              <span>Meta não atingida ainda — continue avançando!</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RemunerationCard({ level, bonusValue }) {
  const total = (level.fixedSalary || 0) + (bonusValue || 0);
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" /> Remuneração estimada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Line label="Fixo mensal" value={formatBRL(level.fixedSalary)} />
        <Line label="Bônus do mês" value={formatBRL(bonusValue)} />
        <Line
          label="Comissões de vendas"
          value="(calculado pelo sistema de comissões)"
          muted
        />
        <Separator className="my-2" />
        <Line label="Estimativa total fixo + bônus" value={formatBRL(total)} bold />
      </CardContent>
    </Card>
  );
}

function Line({ label, value, bold, muted }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className={cn("text-muted-foreground", bold && "text-foreground font-semibold")}>
        {label}
      </span>
      <span className={cn(bold && "font-bold text-base", muted && "text-xs text-muted-foreground")}>
        {value}
      </span>
    </div>
  );
}

function NextLevelCard({ currentLevel, nextLevel, monthlyRevenue }) {
  const goalReached = nextLevel.monthlyGoal && monthlyRevenue >= nextLevel.monthlyGoal;
  const minTimeOk = false; // Sem registro temporal automático ainda — sempre marcado como pendente
  const overall = (goalReached ? 50 : 25) + (minTimeOk ? 50 : 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" /> Caminho para {nextLevel.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <CheckLine
            done={minTimeOk}
            text={`Tempo mínimo no nível atual: ${currentLevel.minTime}`}
          />
          <CheckLine
            done={!!goalReached}
            text={`Meta mensal consistente: ${formatBRL(nextLevel.monthlyGoal)}`}
          />
        </div>
        <div className="space-y-1">
          <Progress value={overall} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {overall}% do caminho para <strong>{nextLevel.title}</strong>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckLine({ done, text }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {done ? (
        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
      ) : (
        <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <span className={cn(done ? "text-foreground" : "text-muted-foreground")}>{text}</span>
    </div>
  );
}

function BifurcationCard() {
  const n6a = CAREER_LEVELS.find((l) => l.level === "N6A");
  const n6b = CAREER_LEVELS.find((l) => l.level === "N6B");
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" /> Próximo passo: dois caminhos possíveis
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[n6a, n6b].map((lv) => (
          <div key={lv.level} className="p-4 rounded-lg border border-border bg-card">
            <Badge
              className="mb-2 text-white"
              style={{ background: lv.color }}
            >
              {lv.level}
            </Badge>
            <div className="font-bold">{lv.title}</div>
            <p className="text-sm text-muted-foreground mt-1">{lv.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function HistoryCards({ history, level }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Histórico (últimos 3 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {history.map((h) => {
            const pct = level.monthlyGoal
              ? (h.revenue / level.monthlyGoal) * 100
              : 0;
            const tier = getBonusTier(h.revenue, level.monthlyGoal);
            const bonus = getBonusValue(level, tier);
            const reached = !!tier;
            return (
              <Card key={`${h.year}-${h.monthIdx}`} className="border-border/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{fmtMonth(h.label)}</div>
                    <Badge
                      className={cn(
                        "border",
                        reached
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
                      )}
                    >
                      {reached ? "Atingiu" : "Não atingiu"}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold">{formatBRL(h.revenue)}</div>
                  <Progress value={Math.min(100, pct)} className="h-1.5" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pct.toFixed(0)}% da meta</span>
                    <span>Bônus: {formatBRL(bonus)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Aba: Mapa de Carreira ──────────────────────────────────────────
function CareerMap({ currentLevelCode }) {
  const [view, setView] = useState("timeline");

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-gradient-to-br from-[#0B1E3D] to-[#14285A] text-white">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          <div className="p-4 rounded-2xl bg-amber-400/20 border border-amber-400/30 shrink-0">
            <Trophy className="h-10 w-10 text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
              Plano de Carreira PassagensComDesconto
            </h2>
            <p className="text-sm text-white/70 max-w-2xl mb-4">
              Cada nível alcançado significa mais responsabilidade, mais reconhecimento e mais ganhos.
              Seu progresso é medido por resultados reais.
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                <strong>8 níveis</strong>
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                De Formação a Gerente Comercial
              </span>
              <span className="px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-200">
                Até R$ 1.200 de bônus mensal
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Visualização
        </h3>
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          <Button
            size="sm"
            variant={view === "timeline" ? "default" : "ghost"}
            onClick={() => setView("timeline")}
            className="gap-1.5 h-8"
          >
            <Map className="h-3.5 w-3.5" /> Timeline
          </Button>
          <Button
            size="sm"
            variant={view === "table" ? "default" : "ghost"}
            onClick={() => setView("table")}
            className="gap-1.5 h-8"
          >
            <TableIcon className="h-3.5 w-3.5" /> Tabela
          </Button>
        </div>
      </div>

      {view === "timeline" ? (
        <CareerTimeline currentLevelCode={currentLevelCode} />
      ) : (
        <CareerTable currentLevelCode={currentLevelCode} />
      )}
    </div>
  );
}

function CareerTimeline({ currentLevelCode }) {
  const linearLevels = CAREER_LEVELS.filter((l) => l.level !== "N6A" && l.level !== "N6B");
  const n6a = CAREER_LEVELS.find((l) => l.level === "N6A");
  const n6b = CAREER_LEVELS.find((l) => l.level === "N6B");
  const currentIdx = CAREER_LEVELS.findIndex((l) => l.level === currentLevelCode);

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
      <div className="space-y-4">
        {linearLevels.map((lv) => {
          const isCurrent = lv.level === currentLevelCode;
          const idx = CAREER_LEVELS.findIndex((x) => x.level === lv.level);
          const isPast = currentIdx >= 0 && idx < currentIdx && !isCurrent;
          return (
            <TimelineNode
              key={lv.level}
              level={lv}
              isCurrent={isCurrent}
              isPast={isPast}
            />
          );
        })}

        {/* Bifurcação N6A / N6B */}
        <div className="relative">
          <div
            className="absolute -left-[20px] top-2 h-12 w-12 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-md z-10"
            style={{ background: "#475569" }}
          >
            <ChevronRight className="h-4 w-4" />
          </div>
          <div className="ml-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <TimelineNode
              level={n6a}
              isCurrent={currentLevelCode === "N6A"}
              isPast={false}
              embedded
            />
            <TimelineNode
              level={n6b}
              isCurrent={currentLevelCode === "N6B"}
              isPast={false}
              embedded
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineNode({ level, isCurrent, isPast, embedded }) {
  return (
    <div className={cn("relative", !embedded && "")}>
      {!embedded && (
        <div
          className={cn(
            "absolute -left-[20px] top-2 h-12 w-12 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold shadow-md z-10 border-4",
            isCurrent ? "border-white" : "border-card"
          )}
          style={{ background: level.color }}
        >
          {level.level}
        </div>
      )}
      <Card
        className={cn(
          !embedded && "ml-4",
          "transition-all",
          isCurrent && "ring-2 shadow-lg",
          isPast && "opacity-60"
        )}
        style={isCurrent ? { borderColor: level.color, boxShadow: `0 0 0 2px ${level.color}33` } : {}}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {embedded && (
                  <Badge style={{ background: level.color }} className="text-white">
                    {level.level}
                  </Badge>
                )}
                <span className="font-bold text-base">{level.title}</span>
                {isCurrent && (
                  <Badge
                    className="text-white"
                    style={{ background: level.color }}
                  >
                    Você está aqui
                  </Badge>
                )}
                {isPast && (
                  <Badge variant="outline" className="gap-1 border-emerald-400 text-emerald-700">
                    <Check className="h-3 w-3" /> Concluído
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-sm">
            <Stat label="Tempo mín." value={level.minTime} />
            <Stat
              label="Meta mensal"
              value={level.monthlyGoal ? formatBRL(level.monthlyGoal) : "—"}
            />
            <Stat label="Meta semanal" value={level.weeklyGoalLabel} />
            <Stat
              label="Fixo"
              value={level.fixedSalary !== null ? formatBRL(level.fixedSalary) : "—"}
            />
            <Stat label="Bônus" value={level.bonusLabel} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
        {label}
      </div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}

function CareerTable({ currentLevelCode }) {
  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <Th>Nível</Th>
              <Th>Cargo</Th>
              <Th>Tempo mín.</Th>
              <Th>Meta mensal</Th>
              <Th>Meta semanal</Th>
              <Th>Fixo</Th>
              <Th>Bônus 100% / 150% / 200%</Th>
              <Th>Conexão</Th>
            </tr>
          </thead>
          <tbody>
            {CAREER_LEVELS.map((lv) => {
              const isCurrent = lv.level === currentLevelCode;
              return (
                <tr
                  key={lv.level}
                  className={cn(
                    "border-b border-border/50 transition-colors",
                    isCurrent && "font-semibold"
                  )}
                  style={
                    isCurrent
                      ? { background: `${lv.color}22` }
                      : { background: `${lv.color}08` }
                  }
                >
                  <td className="px-4 py-3">
                    <Badge style={{ background: lv.color }} className="text-white font-bold">
                      {lv.level}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{lv.title}</span>
                      {isCurrent && (
                        <Badge
                          className="text-white text-[10px]"
                          style={{ background: lv.color }}
                        >
                          Você está aqui
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lv.minTime}</td>
                  <td className="px-4 py-3">
                    {lv.monthlyGoal ? formatBRL(lv.monthlyGoal) : "—"}
                  </td>
                  <td className="px-4 py-3">{lv.weeklyGoalLabel}</td>
                  <td className="px-4 py-3">
                    {lv.fixedSalary !== null ? formatBRL(lv.fixedSalary) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{lv.bonusLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {lv.connection}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({ children }) {
  return (
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-3">
      {children}
    </th>
  );
}

// ─── Util: clarear/escurecer hex ────────────────────────────────────
function shade(hex, percent) {
  const h = hex.replace("#", "");
  const num = parseInt(h, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
