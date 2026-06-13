import { useState } from "react";
import {
  Target, Calendar, Settings, Plus, AlertTriangle, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useToast } from "@/shared/ui/use-toast";
import { useCommercialGoalsData } from "@/features/metas/hooks/useCommercialGoalsData";
import GrowthLadder from "@/features/metas/components/GrowthLadder";
import LadderTable from "@/features/metas/components/LadderTable";
import AdvanceTriggers from "@/features/metas/components/AdvanceTriggers";
import ActiveMonthCard from "@/features/metas/components/ActiveMonthCard";
import EditGoalsDialog from "@/features/metas/components/EditGoalsDialog";

export default function GerenteMetasComerciais() {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const {
    currentMonth,
    sortedGoals,
    maxTarget,
    revenueQuotes,
    goalRevenue,
    getGoalVisualState,
    currentMonthGoal,
    currentMonthLabel,
  } = useCommercialGoalsData();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Escada de Crescimento</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            META-03 — Escada mensal de crescimento · Maio → Outubro 2026
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-warning hover:bg-warning text-white border-0 px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Mês ativo: {currentMonthLabel}
          </Badge>
          <Button onClick={() => setEditOpen(true)} variant="outline" className="gap-2">
            <Settings className="h-4 w-4" /> Editar escada
          </Button>
        </div>
      </div>

      {/* Card explicativo */}
      <Card className="border-0 bg-[#0B1E3D] text-white overflow-hidden">
        <CardContent className="p-6 md:p-7">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-warning/20 border border-warning/30 shrink-0">
              <Sparkles className="h-5 w-5 text-warning" />
            </div>
            <p className="text-base leading-relaxed">
              A escada escolhida é <strong>agressiva, mas realista</strong>. Outubro tem meta
              oficial de <strong>R$ 200.000</strong>, mas a meta de gestão interna será{" "}
              <strong className="text-warning">R$ 220.000</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
              <strong>6 meses</strong>
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
              R$ 30k → R$ 220k
            </span>
            <span className="px-3 py-1.5 rounded-full bg-warning/15 border border-warning/30 text-warning">
              Margem mínima: 15%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Escada visual */}
      <GrowthLadder
        sortedGoals={sortedGoals}
        goalRevenue={goalRevenue}
        getGoalVisualState={getGoalVisualState}
        maxTarget={maxTarget}
      />

      {/* Card grande do mês atual (calendário) — com fallback de aviso */}
      {currentMonthGoal ? (
        <ActiveMonthCard
          goal={currentMonthGoal}
          quotes={revenueQuotes}
          isCurrentMonth={true}
        />
      ) : (
        <Card className="border-warning/30 bg-warning/10 dark:bg-warning/10">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="font-semibold text-warning dark:text-warning">
                Nenhuma meta definida para {currentMonthLabel}
              </div>
              <p className="text-sm text-muted-foreground">
                Adicione uma meta para o mês atual clicando em "Editar escada".
              </p>
            </div>
            <Button onClick={() => setEditOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabela detalhada */}
      <LadderTable
        sortedGoals={sortedGoals}
        goalRevenue={goalRevenue}
        currentMonth={currentMonth}
      />

      {/* Gatilhos de avanço */}
      <AdvanceTriggers sortedGoals={sortedGoals} goalRevenue={goalRevenue} />

      {/* Dialog editar */}
      <EditGoalsDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        goals={sortedGoals}
        toast={toast}
      />
    </div>
  );
}
