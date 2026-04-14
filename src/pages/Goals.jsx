import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/api/supabaseClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Target,
  TrendingUp,
  Award,
  Settings,
  Save,
  Plus,
  Trash2,
  Star,
  CheckCircle,
  AlertCircle,
  Zap,
} from "lucide-react";
import {
  loadGoalsConfig,
  saveGoalsConfig,
  calcMonthlyEstimated,
} from "@/lib/goalsConfig";

const fmt = (value) =>
  value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ??
  "R$ 0,00";

// ──────────────────────────────────────────────────────────────────────────────
// Painel de configurações do gestor
// ──────────────────────────────────────────────────────────────────────────────
function ConfigPanel({ config, onSave }) {
  const [local, setLocal] = useState({ ...config });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const setScope = (scope, key, value) => {
    setLocal(prev => ({
      ...prev,
      [scope]: { ...prev[scope], [key]: value }
    }));
  };

  const setGlobal = (key, value) => setLocal(prev => ({ ...prev, [key]: value }));

  // Bônus especiais
  const addSpecial = () => {
    setLocal((prev) => ({
      ...prev,
      special_bonuses: [
        ...(prev.special_bonuses || []),
        { id: Date.now(), name: "", value: 0, active: true },
      ],
    }));
  };

  const removeSpecial = (id) => {
    setLocal((prev) => ({
      ...prev,
      special_bonuses: prev.special_bonuses.filter((b) => b.id !== id),
    }));
  };

  const updateSpecial = (id, field, value) => {
    setLocal((prev) => ({
      ...prev,
      special_bonuses: prev.special_bonuses.map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      ),
    }));
  };

  const renderScopeConfig = (scope) => {
    const data = local[scope];
    return (
      <div className="space-y-6 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Meta Mensal (pontos)
            </Label>
            <Input
              type="number"
              min={1}
              value={data.monthly_point_goal}
              onChange={(e) => setScope(scope, "monthly_point_goal", parseInt(e.target.value) || 1)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Salário abaixo da meta
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                min={0}
                value={data.salary_below_goal}
                onChange={(e) => setScope(scope, "salary_below_goal", parseFloat(e.target.value) || 0)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Salário ao atingir a meta
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                min={0}
                value={data.salary_at_goal}
                onChange={(e) => setScope(scope, "salary_at_goal", parseFloat(e.target.value) || 0)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bônus por ponto excedente
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                min={0}
                value={data.bonus_per_extra_point}
                onChange={(e) => setScope(scope, "bonus_per_extra_point", parseFloat(e.target.value) || 0)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 border p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Abaixo da meta</span>
            <span className="font-bold text-red-600">{fmt(data.salary_below_goal)}</span>
            <span className="text-xs text-muted-foreground">0 – {data.monthly_point_goal - 1} pontos</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Meta atingida</span>
            <span className="font-bold text-blue-600">{fmt(data.salary_at_goal)}</span>
            <span className="text-xs text-muted-foreground">Exatamente {data.monthly_point_goal} pontos</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Meta superada (+5 pts)</span>
            <span className="font-bold text-green-600">
              {fmt(data.salary_at_goal + 5 * data.bonus_per_extra_point)}
            </span>
            <span className="text-xs text-muted-foreground">
              {fmt(data.salary_at_goal)} + 5 × {fmt(data.bonus_per_extra_point)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6 border-l-4 border-l-primary">
      <div className="flex items-center gap-2 mb-5">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-lg">Configurações de Metas e Bônus</h2>
      </div>

      <Tabs defaultValue="TI/Automações" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="TI/Automações">TI / Automações</TabsTrigger>
          <TabsTrigger value="Educacional/Comercial">Educação / Comercial</TabsTrigger>
          <TabsTrigger value="especiais">Bônus Pontuais</TabsTrigger>
        </TabsList>
        
        <TabsContent value="TI/Automações">
          {renderScopeConfig("TI/Automações")}
        </TabsContent>
        
        <TabsContent value="Educacional/Comercial">
          {renderScopeConfig("Educacional/Comercial")}
        </TabsContent>

        <TabsContent value="especiais" className="space-y-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500" />
                Bônus Especiais Pontuais
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Válidos para todos os contratos neste mês</p>
            </div>
            <Button size="sm" variant="outline" onClick={addSpecial} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>

          {(local.special_bonuses || []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">Nenhum bônus especial configurado.</p>
          ) : (
            <div className="space-y-2">
              {local.special_bonuses.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <button
                    type="button"
                    onClick={() => updateSpecial(b.id, "active", !b.active)}
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      b.active ? "bg-green-500 border-green-500" : "border-muted-foreground"
                    }`}
                  >
                    {b.active && <CheckCircle className="h-3 w-3 text-white" />}
                  </button>
                  <Input
                    placeholder="Nome do bônus"
                    value={b.name}
                    onChange={(e) => updateSpecial(b.id, "name", e.target.value)}
                    className="flex-1 h-8 text-sm"
                  />
                  <div className="relative w-36 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                    <Input
                      type="number"
                      value={b.value}
                      onChange={(e) => updateSpecial(b.id, "value", parseFloat(e.target.value) || 0)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  <button onClick={() => removeSpecial(b.id)} className="shrink-0 text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t">
        {saved && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Salvo com sucesso!
          </span>
        )}
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" /> Salvar Todas as Configurações
        </Button>
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Card de situação do consultor
// ──────────────────────────────────────────────────────────────────────────────
function ContractorGoalCard({ contractor, totalPoints, config }) {
  const scopeType = contractor.scope_type || "TI/Automações";
  const scopeCfg = config[scopeType] || config["TI/Automações"];
  const goal = scopeCfg.monthly_point_goal;
  const calc = calcMonthlyEstimated(totalPoints, config, scopeType);
  const pct = goal > 0 ? Math.min((totalPoints / goal) * 100, 100) : 0;

  let statusLabel, statusColor, statusBg, StatusIcon;
  if (totalPoints < goal) {
    statusLabel = "Abaixo da meta";
    statusColor = "text-red-600";
    statusBg = "bg-red-50";
    StatusIcon = AlertCircle;
  } else if (totalPoints === goal) {
    statusLabel = "Meta atingida";
    statusColor = "text-blue-600";
    statusBg = "bg-blue-50";
    StatusIcon = CheckCircle;
  } else {
    statusLabel = `Meta superada (+${calc.excedente} pts)`;
    statusColor = "text-green-600";
    statusBg = "bg-green-50";
    StatusIcon = Trophy;
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-lg">{contractor.name}</h3>
          <p className="text-sm text-muted-foreground">{scopeType}</p>
        </div>
        <Badge className={`${statusBg} ${statusColor} border-0 px-3 py-1 flex items-center gap-1`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Target className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="font-bold">{goal} pts</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <TrendingUp className="h-5 w-5 text-secondary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Pontuação</p>
            <p className="font-bold">{totalPoints} pts</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Award className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Excedente</p>
            <p className="font-bold">{calc.excedente > 0 ? `+${calc.excedente} pts` : "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Trophy className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Estimado</p>
            <p className={`font-bold text-sm ${statusColor}`}>{fmt(calc.total)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-muted/30 border px-4 py-3 text-xs space-y-1 mb-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Salário base</span>
          <span className="font-medium">{fmt(calc.salarioBase)}</span>
        </div>
        {calc.bonusExtra > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Bônus excedente ({calc.excedente} pts × {fmt(scopeCfg.bonus_per_extra_point)})
            </span>
            <span className="font-medium text-green-600">+{fmt(calc.bonusExtra)}</span>
          </div>
        )}
        {calc.bonusEspecial > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bônus especiais ativos</span>
            <span className="font-medium text-amber-600">+{fmt(calc.bonusEspecial)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t font-semibold">
          <span>Total estimado</span>
          <span className={statusColor}>{fmt(calc.total)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{totalPoints} de {goal} pts</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              totalPoints >= goal ? "bg-green-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

export default function Goals() {
  const [contractors, setContractors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(loadGoalsConfig());
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    async function load() {
      const [c, p] = await Promise.all([
        supabaseClient.entities.Contractor.list(),
        supabaseClient.entities.Project.list(),
      ]);
      setContractors(c.filter((x) => x.status === "Ativo"));
      setProjects(p);
      setLoading(false);
    }
    load();
  }, []);

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
                  <p className="font-bold text-base text-red-500">{fmt(cfg.salary_below_goal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Base (Meta)</p>
                  <p className="font-bold text-base text-blue-500">{fmt(cfg.salary_at_goal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bônus/Ponto Extra</p>
                  <p className="font-bold text-base text-green-500">{fmt(cfg.bonus_per_extra_point)}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {activeSpecials.length > 0 && (
        <Card className="p-4 bg-amber-50/50 border-amber-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-3 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> Bônus Especiais Ativos (Aplicado a todos)
          </p>
          <div className="flex flex-wrap gap-2">
            {activeSpecials.map((b) => (
              <Badge key={b.id} className="bg-amber-100 text-amber-800 border-amber-300">
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