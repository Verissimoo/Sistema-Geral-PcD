import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { calculateScore, isFullyAccepted } from "@/lib/scoring";
import ContractorFormDialog from "../components/contractors/ContractorFormDialog";

const statusColors = {
  "Ativo": "bg-green-100 text-green-700",
  "Em revisão": "bg-amber-100 text-amber-700",
  "Encerrado": "bg-red-100 text-red-700",
};

export default function Contractors() {
  const [contractors, setContractors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [data, allProjects] = await Promise.all([
      localClient.entities.Contractor.list("-created_date"),
      localClient.entities.Project.list(),
    ]);
    setContractors(data);
    setProjects(allProjects);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = contractors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos PJ</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie prestadores e contratos</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Novo Prestador
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar prestador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <Link key={c.id} to={`/contratos/${c.id}`}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-secondary">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-sm">{c.name}</h3>
                <Badge variant="secondary" className={`text-xs ${statusColors[c.status] || ""}`}>
                  {c.status}
                </Badge>
              </div>
              {(() => {
                const cProjects = projects.filter(p => p.contractor_id === c.id);
                const activeAutomations = cProjects.filter(p => p.status === "Em andamento" || p.status === "Concluído").length;
                const completedPoints = cProjects
                  .filter(p => p.status === "Concluído" && isFullyAccepted(p))
                  .reduce((sum, p) => sum + (p.final_score || calculateScore(p)), 0);
                const goal = c.monthly_point_goal || 10;
                return (
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p>Escopo: <span className="text-foreground font-medium">{c.scope_type}</span></p>
                    <p>Valor base: <span className="text-foreground font-medium">R$ {c.monthly_fixed_value?.toLocaleString("pt-BR")}</span></p>
                    <div className="flex gap-3 pt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        {activeAutomations} automações
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                        completedPoints >= goal ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {completedPoints}/{goal} pts
                      </span>
                    </div>
                  </div>
                );
              })()}
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum prestador encontrado</p>
        </div>
      )}

      <ContractorFormDialog open={showForm} onClose={() => setShowForm(false)} onSave={load} />
    </div>
  );
}