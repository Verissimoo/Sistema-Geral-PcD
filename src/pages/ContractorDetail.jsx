import { useState, useEffect } from "react";
import { supabaseClient } from "@/api/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Edit, TrendingUp, Zap, Info } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { calculateScore, isFullyAccepted, getGoalStatus } from "@/lib/scoring";
import ContractorFormDialog from "../components/contractors/ContractorFormDialog";

const statusColors = {
  "Ativo": "bg-green-100 text-green-700",
  "Em revisão": "bg-amber-100 text-amber-700",
  "Encerrado": "bg-red-100 text-red-700",
};

const fmt = (value) =>
  value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "R$ 0,00";

function calcMonthly(contractor, totalPoints, goal) {
  const min = contractor.min_base_value ?? 1000;
  const max = contractor.max_base_value ?? 2000;
  const automations = contractor.active_automations ?? [];
  const recorrencia = automations.reduce((s, a) => s + (a.monthly_value ?? 100), 0);

  let valorBase = min;
  if (goal > 0) {
    const ratio = Math.min(totalPoints / goal, 1);
    valorBase = min + (max - min) * ratio;
  }

  let bonusExtra = 0;
  if (totalPoints > goal && goal > 0) {
    const excedente = totalPoints - goal;
    bonusExtra = excedente * ((max - min) / goal);
  }

  return { valorBase, recorrencia, bonusExtra, total: valorBase + recorrencia + bonusExtra, min, max };
}

function ValorMensalCard({ contractor, totalPoints, goal }) {
  const [showDetail, setShowDetail] = useState(false);
  const calc = calcMonthly(contractor, totalPoints, goal);
  const automations = contractor.active_automations ?? [];

  return (
    <>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground mb-1">Valor Mensal Estimado</p>
        <p className="text-2xl font-bold text-primary">{fmt(calc.total)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Base: {fmt(calc.valorBase)} · Automações: {fmt(calc.recorrencia)} · Bônus: {fmt(calc.bonusExtra)}
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
            <div>
              <p className="font-medium">Valor base proporcional: {fmt(calc.valorBase)}</p>
              <p className="text-xs text-muted-foreground">({totalPoints} pts de {goal} pts meta)</p>
            </div>
            <div>
              <p className="font-medium">Recorrência de automações: {fmt(calc.recorrencia)}</p>
              <p className="text-xs text-muted-foreground">
                ({automations.length} automações ativas × média {fmt(automations.length > 0 ? calc.recorrencia / automations.length : 0)} cada)
              </p>
            </div>
            <div>
              <p className="font-medium">Bônus por excedente: {fmt(calc.bonusExtra)}</p>
              <p className="text-xs text-muted-foreground">({Math.max(0, totalPoints - goal)} pts acima da meta)</p>
            </div>
            <hr />
            <div>
              <p className="font-bold text-base">Total estimado: {fmt(calc.total)}</p>
            </div>
            <p className="text-xs text-muted-foreground">Valores calculados com base na pontuação atual do período</p>
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
  const goal = contractor.monthly_point_goal || 10;
  const goalStatus = getGoalStatus(totalPoints, goal);

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
        <ValorMensalCard contractor={contractor} totalPoints={totalPoints} goal={goal} />
        <AutomacoesCard contractor={contractor} onEdit={() => setShowEdit(true)} />
        <Card className={`p-4 ${goalStatus.bg}`}>
          <p className="text-xs text-muted-foreground">Pontuação</p>
          <p className={`text-xl font-bold mt-1 ${goalStatus.color}`}>{totalPoints}/{goal} pts</p>
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