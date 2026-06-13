import { useState, useMemo, useCallback } from "react";
import { useContractors, useProjects } from "@/api/hooks";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Settings,
  Star,
  Zap,
} from "lucide-react";
import {
  loadGoalsConfig,
  saveGoalsConfig,
} from "@/features/metas/goalsConfig";
import { fmt } from "@/features/metas/lib/goalsFormat";
import ConfigPanel from "@/features/metas/components/ConfigPanel";
import ContractorGoalCard from "@/features/metas/components/ContractorGoalCard";

export default function Goals() {
  const { data: allContractors = [], isLoading: contractorsLoading } = useContractors();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const loading = contractorsLoading || projectsLoading;
  const contractors = useMemo(
    () => allContractors.filter((x) => x.status === "Ativo"),
    [allContractors]
  );
  const [config, setConfig] = useState(loadGoalsConfig());
  const [showConfig, setShowConfig] = useState(false);

  const handleSaveConfig = useCallback((newConfig) => {
    saveGoalsConfig(newConfig);
    setConfig(newConfig);
  }, []);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const getMonthlyPoints = (contractorId) => {
    return projects
      .filter((p) => {
        if (p.contractor_id !== contractorId) return false;
        if (p.status !== "Concluído") return false;
        // Prioriza a data de conclusão para bônus mensal
        const dateStr = p.completion_date || p.contract_date || p.created_at;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, p) => sum + (p.final_score || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const activeSpecials = (config.special_bonuses || []).filter((b) => b.active);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas e Bônus</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure as regras mensais de remuneração por escopo</p>
        </div>
        <Button
          variant={showConfig ? "default" : "outline"}
          onClick={() => setShowConfig((v) => !v)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          {showConfig ? "Fechar Configuração" : "Configurar Regras"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {["TI/Automações", "Educacional/Comercial"].map(scope => {
          const cfg = config[scope];
          return (
            <Card key={scope} className="p-4 border-t-4 border-t-secondary">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-secondary" />
                <h3 className="font-bold text-sm">{scope}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Meta</p>
                  <p className="font-bold text-base">{cfg.monthly_point_goal} pts</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Base (Abaixo)</p>
                  <p className="font-bold text-base text-danger">{fmt(cfg.salary_below_goal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Base (Meta)</p>
                  <p className="font-bold text-base text-accent">{fmt(cfg.salary_at_goal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bônus/Ponto Extra</p>
                  <p className="font-bold text-base text-success">{fmt(cfg.bonus_per_extra_point)}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {activeSpecials.length > 0 && (
        <Card className="p-4 bg-warning/10 border-warning/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning mb-3 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> Bônus Especiais Ativos (Aplicado a todos)
          </p>
          <div className="flex flex-wrap gap-2">
            {activeSpecials.map((b) => (
              <Badge key={b.id} className="bg-warning/10 text-warning border-warning/30">
                {b.name} · {fmt(b.value)}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {showConfig && <ConfigPanel config={config} onSave={handleSaveConfig} />}

      <div className="space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-widest pt-4">
          Status em Tempo Real — {now.toLocaleString("pt-BR", { month: "long" })}
        </h2>
        {contractors.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum prestador ativo
          </Card>
        ) : (
          contractors.map((c) => (
            <ContractorGoalCard key={c.id} contractor={c} totalPoints={getMonthlyPoints(c.id)} config={config} />
          ))
        )}
      </div>
    </div>
  );
}
