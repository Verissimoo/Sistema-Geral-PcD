import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, TrendingUp, Award } from "lucide-react";
import { calculateScore, isFullyAccepted, getGoalStatus } from "@/lib/scoring";

export default function Goals() {
  const [contractors, setContractors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [c, p] = await Promise.all([
        localClient.entities.Contractor.list(),
        localClient.entities.Project.list(),
      ]);
      setContractors(c.filter(x => x.status === "Ativo"));
      setProjects(p);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const getContractorData = (contractor) => {
    const cProjects = projects.filter(p => p.contractor_id === contractor.id);
    const completed = cProjects.filter(p => p.status === "Concluído" && isFullyAccepted(p));
    const totalPoints = completed.reduce((sum, p) => sum + (p.final_score || calculateScore(p)), 0);
    const goal = contractor.monthly_point_goal || 10;
    const goalStatus = getGoalStatus(totalPoints, goal);
    const allValidated = completed.every(isFullyAccepted);

    let bonusLevel = "Nenhum";
    let bonusValue = 0;
    if (totalPoints >= goal && allValidated) {
      bonusLevel = "Faixa 1";
      bonusValue = contractor.bonus_tier1_value || 0;
    }
    if (totalPoints > goal) {
      bonusLevel = "Faixa 2";
      bonusValue = (contractor.bonus_tier2_value || 0);
    }
    // Additional bonus criteria
    const hasAnticipated = completed.some(p => p.deadline_status === "Antecipado");
    const hasHighImpact = completed.some(p => p.business_impact === "Alto" || p.business_impact === "Muito alto");
    const hasFullDoc = completed.some(p => p.documentation_level === "Completo");
    if (hasAnticipated && hasHighImpact && hasFullDoc && totalPoints > goal) {
      bonusValue += (contractor.bonus_additional_value || 0);
      bonusLevel = "Faixa 2 + Adicional";
    }

    return { totalPoints, goal, goalStatus, bonusLevel, bonusValue, completed, total: cProjects.length };
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Metas e Bonificação</h1>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe metas e bônus por prestador</p>
      </div>

      {contractors.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum prestador ativo</Card>
      ) : (
        <div className="space-y-4">
          {contractors.map(c => {
            const data = getContractorData(c);
            const pct = data.goal > 0 ? Math.min((data.totalPoints / data.goal) * 100, 100) : 0;

            return (
              <Card key={c.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{c.name}</h3>
                    <p className="text-sm text-muted-foreground">{c.scope_type} · R$ {c.monthly_fixed_value?.toLocaleString("pt-BR")}/mês</p>
                  </div>
                  <Badge className={`${data.goalStatus.bg} ${data.goalStatus.color} px-3 py-1`}>
                    {data.goalStatus.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Target className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Meta</p>
                      <p className="font-bold">{data.goal} pts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-secondary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Atingido</p>
                      <p className="font-bold">{data.totalPoints} pts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Trophy className="h-5 w-5 text-secondary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Faixa Bônus</p>
                      <p className="font-bold text-sm">{data.bonusLevel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Award className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Bônus</p>
                      <p className="font-bold text-green-600">R$ {data.bonusValue?.toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{data.completed.length} projeto(s) concluído(s) de {data.total} total</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}