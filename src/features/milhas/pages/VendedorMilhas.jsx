import { useState, useEffect, useMemo } from "react";
import {
  Star, Plus, AlertTriangle, TrendingDown, Award, History,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { useToast } from "@/shared/ui/use-toast";
import { cn } from "@/shared/lib/utils";
import { seedMilesIfEmpty } from "@/api/seeds";
import {
  useMilesTable, useCreateMilesProgram, useUpdateMilesProgram, useDeleteMilesProgram,
} from "@/api/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { getMarginPercent, isOutdated } from "@/features/milhas/milesHelper";
import { fmt, Th } from "@/features/milhas/components/milhasShared";
import { ProgramRow } from "@/features/milhas/components/ProgramRow";
import { ProgramDialog } from "@/features/milhas/components/ProgramDialog";
import { HistoricoPrecos } from "@/features/milhas/components/HistoricoPrecos";

export default function VendedorMilhas() {
  const { isAdmin, isSuporte, user } = useAuth();
  const canEdit = isAdmin || isSuporte;
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState("atual");

  // Preserva a ordem antiga: seed roda antes da primeira listagem.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    seedMilesIfEmpty().then(() => setSeeded(true));
  }, []);
  const { data = [] } = useMilesTable({ enabled: seeded });
  const createProgram = useCreateMilesProgram();
  const updateProgram = useUpdateMilesProgram();
  const deleteProgram = useDeleteMilesProgram();

  // Métricas de resumo
  const summary = useMemo(() => {
    if (data.length === 0) return null;
    const cheapest = [...data].sort((a, b) => a.cost_per_thousand - b.cost_per_thousand)[0];
    const withMargin = data.map((d) => ({
      ...d, marginPct: getMarginPercent(d.cost_per_thousand, d.sale_per_thousand),
    }));
    const highestMargin = [...withMargin].sort((a, b) => b.marginPct - a.marginPct)[0];
    const outdatedCount = data.filter((d) => isOutdated(d.updated_date, 30)).length;
    return { cheapest, highestMargin, outdatedCount };
  }, [data]);

  // Dialog handlers
  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setDialogOpen(true);
  };
  const openEditTiers = (item) => {
    openEdit(item);
  };
  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este programa?")) return;
    try {
      await deleteProgram.mutateAsync(id);
    } catch {
      return; // Erro já notificado pelo toast central do queryClient.
    }
    toast({ title: "Programa excluído" });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Tabela de Valor de Milhas</h1>
            <Badge variant="outline" className="font-medium">
              {data.length} programa{data.length === 1 ? "" : "s"} ativo{data.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Preços de custo e venda por programa de milhagem · Atualizado pela gestão
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Adicionar Programa
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="atual" className="gap-2">
            <Star className="h-3.5 w-3.5" /> Preços atuais
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-3.5 w-3.5" /> Histórico de mudanças
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atual" className="space-y-4 mt-4">

      {/* Cards de resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-success/30 bg-success/10 dark:bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-success dark:text-success mb-2">
                <TrendingDown className="h-4 w-4" />
                <span>Programa mais barato</span>
              </div>
              <div className="font-bold text-base">{summary.cheapest.program}</div>
              <div className="text-success dark:text-success font-semibold mt-1">
                {fmt(summary.cheapest.cost_per_thousand)} / mil
              </div>
            </CardContent>
          </Card>
          <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-warning dark:text-warning mb-2">
                <Award className="h-4 w-4" />
                <span>Maior margem</span>
              </div>
              <div className="font-bold text-base">{summary.highestMargin.program}</div>
              <div className="text-warning dark:text-warning font-semibold mt-1">
                {summary.highestMargin.marginPct}%
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "border-border/50",
            summary.outdatedCount > 0 && "border-danger/30 bg-danger/10 dark:bg-danger/5"
          )}>
            <CardContent className="p-4">
              <div className={cn(
                "flex items-center gap-2 text-xs mb-2",
                summary.outdatedCount > 0
                  ? "text-danger dark:text-danger"
                  : "text-muted-foreground"
              )}>
                <AlertTriangle className="h-4 w-4" />
                <span>Alertas de atualização</span>
              </div>
              <div className="font-bold text-base">
                {summary.outdatedCount} programa{summary.outdatedCount === 1 ? "" : "s"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Mais de 30 dias sem atualizar
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <Th>Programa</Th>
                <Th>Custo/mil</Th>
                <Th>Venda/mil</Th>
                <Th>Margem</Th>
                <Th>Variabilidade</Th>
                <Th>Atualização</Th>
                {canEdit && <Th align="right">Ações</Th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <ProgramRow
                  key={item.id}
                  item={item}
                  isAdmin={canEdit}
                  expanded={expandedId === item.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }
                  onEdit={() => openEdit(item)}
                  onEditTiers={() => openEditTiers(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={canEdit ? 7 : 6}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    Nenhum programa cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <HistoricoPrecos active={activeTab === "historico"} />
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <ProgramDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        user={user}
        createProgram={createProgram}
        updateProgram={updateProgram}
        toast={toast}
      />
    </div>
  );
}
