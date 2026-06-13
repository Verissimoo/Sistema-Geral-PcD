import { useMemo } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Trophy, Target, DollarSign } from "lucide-react";
import {
  getSellerStats, getCurrentLevel, getNextLevel, getBonusTier, getBonusValue,
} from "@/features/carreira/careerPlan";
import { formatBRL } from "@/shared/lib/format";
import { MetricCard } from "./careerShared";
import { HeroLevel } from "./HeroLevel";
import { CommissionsSection } from "./CommissionsSection";
import {
  BonusTiers, RemunerationCard, NextLevelCard, BifurcationCard, HistoryCards,
} from "./ProgressExtras";

export function ProgressView({ seller, quotes }) {
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
          color="text-success"
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
          color="text-success"
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

      {/* Comissões e remuneração do mês */}
      <CommissionsSection seller={seller} quotes={quotes} currentLevel={currentLevel} />

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
        <Card className="border-success/30 bg-success/10 dark:bg-success/5">
          <CardContent className="p-5 text-sm text-success dark:text-success flex items-start gap-2">
            <Trophy className="h-5 w-5 text-success shrink-0" />
            Você atingiu o topo do plano de carreira atual.
          </CardContent>
        </Card>
      )}

      {/* Histórico mensal */}
      <HistoryCards history={stats.monthlyHistory} level={currentLevel} />
    </div>
  );
}
