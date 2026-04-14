import { useState, useEffect } from "react";
import { supabaseClient } from "@/api/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Edit, TrendingUp, Zap, Info, CheckCircle, AlertCircle, Trophy } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { calculateScore, isFullyAccepted, getGoalStatus } from "@/lib/scoring";
import ContractorFormDialog from "../components/contractors/ContractorFormDialog";
import { loadGoalsConfig, calcMonthlyEstimated } from "@/lib/goalsConfig";

const statusColors = {
  "Ativo": "bg-green-100 text-green-700",
  "Em revisão": "bg-amber-100 text-amber-700",
  "Encerrado": "bg-red-100 text-red-700",
};

const fmt = (value) =>
  value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "R$ 0,00";

function ValorMensalCard({ contractor, monthlyContracts }) {
  const [showDetail, setShowDetail] = useState(false);
  const config = loadGoalsConfig();
  const scopeType = contractor.scope_type || "TI/Automações";
  const calc = calcMonthlyEstimated(monthlyContracts, config, scopeType);
  const goal = (config[scopeType] || config["TI/Automações"]).monthly_point_goal;

  let statusColor, StatusIcon;
  if (monthlyContracts < goal) {
    statusColor = "text-red-600";
    StatusIcon = AlertCircle;
  } else if (monthlyContracts === goal) {
    statusColor = "text-blue-600";
    StatusIcon = CheckCircle;
  } else {
    statusColor = "text-green-600";
    StatusIcon = Trophy;
  }

  return (
    <>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground mb-1">Valor Mensal Estimado</p>
        <p className={`text-2xl font-bold ${statusColor}`}>{fmt(calc.total)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {monthlyContracts} de {goal} pts · {calc.excedente > 0 ? `+${calc.excedente} pts acima` : calc.excedente === 0 && monthlyContracts >= goal ? "Meta atingida" : "Abaixo da meta"}
        </p>
        <button
          onClick={() => setShowDetail(true)}
          className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
        >
          <Info className="h-3 w-3" /> Ver detalhamento
        </button>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Detalhamento do Valor Mensal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${statusColor}`} />
              <p className="font-medium">
                {monthlyContracts < goal
                  ? "Abaixo da meta"
                  : monthlyContracts === goal
                  ? "Meta atingida!"
                  : `Meta superada! (+${calc.excedente} pts)`}
              </p>
            </div>
            <div className="rounded-md bg-muted/40 p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pontuação no mês</span>
                <span className="font-bold">{monthlyContracts} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meta configurada</span>
                <span className="font-bold">{goal} pts</span>
              </div>
            </div>
            <div>
              <p className="font-medium">Salário base: {fmt(calc.salarioBase)}</p>
              <p className="text-xs text-muted-foreground">
                {monthlyContracts < goal
                  ? `Abaixo da meta → ${fmt(config.salary_below_goal)}`
                  : `Meta atingida → ${fmt(config.salary_at_goal)}`}
              </p>
            </div>
            {calc.bonusExtra > 0 && (
              <div>
                <p className="font-medium text-green-600">Bônus excedente: +{fmt(calc.bonusExtra)}</p>
                <p className="text-xs text-muted-foreground">
                  {calc.excedente} pts × {fmt(config.bonus_per_extra_point)} cada
                </p>
              </div>
            )}
            {calc.bonusEspecial > 0 && (
              <div>
                <p className="font-medium text-amber-600">Bônus especiais: +{fmt(calc.bonusEspecial)}</p>
                <p className="text-xs text-muted-foreground">Bônus pontuais configurados pelo gestor</p>
              </div>
            )}
            <hr />
            <div>
              <p className={`font-bold text-base ${statusColor}`}>Total estimado: {fmt(calc.total)}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Valores baseados nas configurações de Metas e Bônus definidas pelo gestor
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AutomacoesCard({ contractor, onEdit }) {
  const [showModal, setShowModal] = useState(false);
  const automations = contractor.active_automations ?? [];
  const recorrencia = automations.reduce((s, a) => s + (a.monthly_value ?? 100), 0);

  return (
    <>
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-3.5 w-3.5 text-secondary" />
          <p className="text-xs text-muted-foreground">Automações Ativas</p>
        </div>
        <p className="text-2xl font-bold">{automations.length}</p>
        <p className="text-xs text-muted-foreground mt-1">{fmt(recorrencia)}/mês em recorrência</p>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-secondary" /> Automações Ativas
            </DialogTitle>
          </DialogHeader>
          {automations.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-foreground text-sm">Nenhuma automação ativa cadastrada</p>
              <Button size="sm" onClick={() => { setShowModal(false); onEdit(); }}>
                Adicionar automação
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {automations.map((a, i) => (
                <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{a.name}</p>
                    <Badge variant="secondary" className="text-xs">{fmt(a.monthly_value ?? 100)}/mês</Badge>
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                  {a.active_since && (
                    <p className="text-xs text-muted-foreground">
                      Ativo desde: {new Date(a.active_since).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              ))}
              <div className="pt-2 border-t text-sm font-semibold flex justify-between">
                <span>Total de recorrência mensal</span>
                <span className="text-primary">{fmt(recorrencia)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ContractorDetail() {
  const { id } = useParams();
  const [contractor, setContractor] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const load = async () => {
    const [allContractors, allProjects] = await Promise.all([
      supabaseClient.entities.Contractor.list(),
      supabaseClient.entities.Project.list(),
    ]);
    const c = allContractors.find(x => x.id === id);
    setContractor(c);
    setProjects(allProjects.filter(p => p.contractor_id === id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!contractor) {
    return <div className="text-center py-12 text-muted-foreground">Prestador não encontrado</div>;
  }

  const completedProjects = projects.filter(p => p.status === "Concluído" && isFullyAccepted(p));
  const totalPoints = completedProjects.reduce((sum, p) => sum + (p.final_score || calculateScore(p)), 0);
  
  const config = loadGoalsConfig();
  const scopeType = contractor.scope_type || "TI/Automações";
  const goal = (config[scopeType] || config["TI/Automações"]).monthly_point_goal;
  // Pontuação acumulada no mês atual (para Valor Mensal Estimado)
  const now = new Date();
  const monthlyPoints = projects
    .filter(p => {
      if (p.status !== "Concluído") return false;
      // Prioriza a data de conclusão para bônus mensal
      const dateStr = p.completion_date || p.contract_date || p.created_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, p) => sum + (p.final_score || 0), 0);

  const goalStatus = getGoalStatus(monthlyPoints, goal);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link to="/contratos">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{contractor.name}</h1>
          <p className="text-muted-foreground text-sm">{contractor.scope_type}</p>
        </div>
        <Badge className={statusColors[contractor.status]}>{contractor.status}</Badge>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowEdit(true)}>
          <Edit className="h-3.5 w-3.5" /> Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ValorMensalCard contractor={contractor} monthlyContracts={monthlyPoints} />
        <AutomacoesCard contractor={contractor} onEdit={() => setShowEdit(true)} />
        <Card className={`p-4 ${goalStatus.bg}`}>
          <p className="text-xs text-muted-foreground">Pontuação Mensal</p>
          <p className={`text-xl font-bold mt-1 ${goalStatus.color}`}>{monthlyPoints}/{goal} pts</p>
          <p className={`text-xs mt-1 ${goalStatus.color}`}>{goalStatus.label}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-secondary" />
          Histórico de Projetos ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum projeto vinculado</p>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.impacted_area} · {p.value_type}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{p.status}</Badge>
                <span className="text-sm font-semibold text-secondary shrink-0">
                  {p.final_score || calculateScore(p)} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showEdit && (
        <ContractorFormDialog
          open={showEdit}
          onClose={() => setShowEdit(false)}
          onSave={load}
          contractor={contractor}
        />
      )}
    </div>
  );
}