import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { KpiCards } from "@/features/dashboard/components/KpiCards";
import { MargemEquipeCard } from "@/features/dashboard/components/MargemEquipeCard";
import { SalesChart } from "@/features/dashboard/components/SalesChart";
import { MetaCard } from "@/features/dashboard/components/MetaCard";
import { FunilConversao } from "@/features/dashboard/components/FunilConversao";
import { RankingVendedores } from "@/features/dashboard/components/RankingVendedores";
import { AtividadeRecente } from "@/features/dashboard/components/AtividadeRecente";

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    periodo,
    setPeriodo,
    periodoCustom,
    setPeriodoCustom,
    periodDates,
    periodQuotes,
    totalRevenue,
    totalEmitidos,
    pipelineQuotes,
    pipelineValue,
    margemEquipe,
    activeSellers,
    emFormacao,
    chartData,
    maxValue,
    totalCotacoes,
    totalVendas,
    conversao,
    now,
    metaAtual,
    receitaMes,
    funil,
    topPerformers,
    maxSellerRevenue,
    recentActivity,
  } = useDashboardData();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Dashboard Gerencial
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Visão geral da operação — PassagensComDesconto
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2 text-text-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Último mês</SelectItem>
              <SelectItem value="90">Último trimestre</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {periodo === "custom" && (
            <>
              <Input
                type="date"
                value={periodoCustom.start}
                onChange={(e) =>
                  setPeriodoCustom((p) => ({ ...p, start: e.target.value }))
                }
                className="w-40"
              />
              <span className="text-text-muted">até</span>
              <Input
                type="date"
                value={periodoCustom.end}
                onChange={(e) =>
                  setPeriodoCustom((p) => ({ ...p, end: e.target.value }))
                }
                className="w-40"
              />
            </>
          )}

          <Badge variant="outline" className="ml-2">
            {now.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </Badge>
        </div>
      </div>

      {/* Row 1 — 5 cards de métricas */}
      <KpiCards
        periodQuotes={periodQuotes}
        periodDates={periodDates}
        totalEmitidos={totalEmitidos}
        totalRevenue={totalRevenue}
        pipelineQuotes={pipelineQuotes}
        pipelineValue={pipelineValue}
        activeSellers={activeSellers}
        emFormacao={emFormacao}
      />

      {/* Margem da Equipe Comercial */}
      <MargemEquipeCard margemEquipe={margemEquipe} />

      {/* Row 2 — Gráfico + Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <SalesChart
          periodDates={periodDates}
          chartData={chartData}
          maxValue={maxValue}
          totalCotacoes={totalCotacoes}
          totalVendas={totalVendas}
          conversao={conversao}
        />

        <MetaCard
          metaAtual={metaAtual}
          receitaMes={receitaMes}
          navigate={navigate}
        />
      </div>

      {/* Row 3 — Funil + Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <FunilConversao funil={funil} periodQuotes={periodQuotes} />

        <RankingVendedores
          topPerformers={topPerformers}
          maxSellerRevenue={maxSellerRevenue}
          periodo={periodo}
          navigate={navigate}
        />
      </div>

      {/* Row 4 — Atividade Recente */}
      <AtividadeRecente recentActivity={recentActivity} />
    </div>
  );
}
