import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Clock, FileText, TrendingUp, Users } from "lucide-react";
import { calculateScore, isFullyAccepted } from "@/lib/scoring";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, c] = await Promise.all([
        localClient.entities.Project.list(),
        localClient.entities.Contractor.list(),
      ]);
      setProjects(p);
      setContractors(c);
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

  const statusCounts = {
    "Backlog": projects.filter(p => p.status === "Backlog").length,
    "Em andamento": projects.filter(p => p.status === "Em andamento").length,
    "Em validação": projects.filter(p => p.status === "Em validação").length,
    "Concluído": projects.filter(p => p.status === "Concluído").length,
    "Cancelado": projects.filter(p => p.status === "Cancelado").length,
  };

  // Points per contractor for current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const completedProjects = projects.filter(p => 
    p.status === "Concluído" && isFullyAccepted(p)
  );

  const pointsByContractor = {};
  contractors.forEach(c => { pointsByContractor[c.id] = { name: c.name, points: 0, goal: c.monthly_point_goal || 10 }; });
  completedProjects.forEach(p => {
    if (pointsByContractor[p.contractor_id]) {
      pointsByContractor[p.contractor_id].points += (p.final_score || calculateScore(p));
    }
  });

  // Alerts
  const alerts = [];
  const noDocCompleted = projects.filter(p => p.status === "Concluído" && p.documentation_level === "Sem documentação");
  if (noDocCompleted.length > 0) {
    alerts.push({ type: "warning", message: `${noDocCompleted.length} projeto(s) concluído(s) sem documentação` });
  }
  const overdue = projects.filter(p => p.deadline && new Date(p.deadline) < now && p.status !== "Concluído" && p.status !== "Cancelado");
  if (overdue.length > 0) {
    alerts.push({ type: "danger", message: `${overdue.length} projeto(s) com prazo vencido` });
  }
  const pendingAcceptance = projects.filter(p => p.status === "Concluído" && !isFullyAccepted(p));
  if (pendingAcceptance.length > 0) {
    alerts.push({ type: "info", message: `${pendingAcceptance.length} projeto(s) concluído(s) com aceite pendente` });
  }

  const statCards = [
    { label: "Total de Projetos", value: projects.length, icon: FileText, color: "text-primary" },
    { label: "Em Andamento", value: statusCounts["Em andamento"], icon: Clock, color: "text-secondary" },
    { label: "Concluídos", value: statusCounts["Concluído"], icon: CheckCircle, color: "text-green-600" },
    { label: "Prestadores Ativos", value: contractors.filter(c => c.status === "Ativo").length, icon: Users, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do módulo de Contratos PJ</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.value}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-secondary" />
            Pontuação por Prestador
          </h2>
          <div className="space-y-3">
            {Object.values(pointsByContractor).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum prestador cadastrado</p>
            ) : (
              Object.values(pointsByContractor).map((c, i) => {
                const pct = c.goal > 0 ? Math.min((c.points / c.goal) * 100, 100) : 0;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground">{c.points}/{c.goal} pts</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-secondary transition-all duration-500" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-secondary" />
            Alertas
          </h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                  a.type === "danger" ? "bg-red-50 text-red-700" :
                  a.type === "warning" ? "bg-amber-50 text-amber-700" :
                  "bg-blue-50 text-blue-700"
                }`}>
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-sm">{a.message}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Projetos por Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground mt-1">{status}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}