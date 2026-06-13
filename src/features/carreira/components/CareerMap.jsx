import { useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Trophy, Check, Map, Table as TableIcon, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { CAREER_LEVELS } from "@/features/carreira/careerPlan";
import { formatBRL } from "@/shared/lib/format";
import { Stat, Th } from "./careerShared";

export function CareerMap({ currentLevelCode }) {
  const [view, setView] = useState("timeline");

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-[#0B1E3D] text-white">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          <div className="p-4 rounded-2xl bg-warning/20 border border-warning/30 shrink-0">
            <Trophy className="h-10 w-10 text-warning" />
          </div>
          <div className="flex-1">
            <img
              src="/brand/logo.png"
              alt="PassagensComDesconto"
              className="h-7 md:h-8 w-auto object-contain select-none mb-3"
              draggable={false}
            />
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
              Plano de Carreira
            </h2>
            <p className="text-sm text-white/70 max-w-2xl mb-4">
              Cada nível alcançado significa mais responsabilidade, mais reconhecimento e mais ganhos.
              Seu progresso é medido por resultados reais.
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                <strong>8 níveis</strong>
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                De Formação a Gerente Comercial
              </span>
              <span className="px-3 py-1.5 rounded-full bg-warning/15 border border-warning/30 text-warning">
                Até R$ 1.200 de bônus mensal
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Visualização
        </h3>
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          <Button
            size="sm"
            variant={view === "timeline" ? "default" : "ghost"}
            onClick={() => setView("timeline")}
            className="gap-1.5 h-8"
          >
            <Map className="h-3.5 w-3.5" /> Timeline
          </Button>
          <Button
            size="sm"
            variant={view === "table" ? "default" : "ghost"}
            onClick={() => setView("table")}
            className="gap-1.5 h-8"
          >
            <TableIcon className="h-3.5 w-3.5" /> Tabela
          </Button>
        </div>
      </div>

      {view === "timeline" ? (
        <CareerTimeline currentLevelCode={currentLevelCode} />
      ) : (
        <CareerTable currentLevelCode={currentLevelCode} />
      )}
    </div>
  );
}

function CareerTimeline({ currentLevelCode }) {
  const linearLevels = CAREER_LEVELS.filter((l) => l.level !== "N6A" && l.level !== "N6B");
  const n6a = CAREER_LEVELS.find((l) => l.level === "N6A");
  const n6b = CAREER_LEVELS.find((l) => l.level === "N6B");
  const currentIdx = CAREER_LEVELS.findIndex((l) => l.level === currentLevelCode);

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
      <div className="space-y-4">
        {linearLevels.map((lv) => {
          const isCurrent = lv.level === currentLevelCode;
          const idx = CAREER_LEVELS.findIndex((x) => x.level === lv.level);
          const isPast = currentIdx >= 0 && idx < currentIdx && !isCurrent;
          return (
            <TimelineNode
              key={lv.level}
              level={lv}
              isCurrent={isCurrent}
              isPast={isPast}
            />
          );
        })}

        {/* Bifurcação N6A / N6B */}
        <div className="relative">
          <div
            className="absolute -left-[20px] top-2 h-12 w-12 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-md z-10"
            style={{ background: "#475569" }}
          >
            <ChevronRight className="h-4 w-4" />
          </div>
          <div className="ml-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <TimelineNode
              level={n6a}
              isCurrent={currentLevelCode === "N6A"}
              isPast={false}
              embedded
            />
            <TimelineNode
              level={n6b}
              isCurrent={currentLevelCode === "N6B"}
              isPast={false}
              embedded
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineNode({ level, isCurrent, isPast, embedded }) {
  return (
    <div className={cn("relative", !embedded && "")}>
      {!embedded && (
        <div
          className={cn(
            "absolute -left-[20px] top-2 h-12 w-12 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold shadow-md z-10 border-4",
            isCurrent ? "border-white" : "border-card"
          )}
          style={{ background: level.color }}
        >
          {level.level}
        </div>
      )}
      <Card
        className={cn(
          !embedded && "ml-4",
          "transition-all",
          isCurrent && "ring-2 shadow-lg",
          isPast && "opacity-60"
        )}
        style={isCurrent ? { borderColor: level.color, boxShadow: `0 0 0 2px ${level.color}33` } : {}}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {embedded && (
                  <Badge style={{ background: level.color }} className="text-white">
                    {level.level}
                  </Badge>
                )}
                <span className="font-bold text-base">{level.title}</span>
                {isCurrent && (
                  <Badge
                    className="text-white"
                    style={{ background: level.color }}
                  >
                    Você está aqui
                  </Badge>
                )}
                {isPast && (
                  <Badge variant="outline" className="gap-1 border-success/30 text-success">
                    <Check className="h-3 w-3" /> Concluído
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-sm">
            <Stat label="Tempo mín." value={level.minTime} />
            <Stat
              label="Meta mensal"
              value={level.monthlyGoal ? formatBRL(level.monthlyGoal) : "—"}
            />
            <Stat label="Meta semanal" value={level.weeklyGoalLabel} />
            <Stat
              label="Fixo"
              value={level.fixedSalary !== null ? formatBRL(level.fixedSalary) : "—"}
            />
            <Stat label="Bônus" value={level.bonusLabel} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CareerTable({ currentLevelCode }) {
  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <Th>Nível</Th>
              <Th>Cargo</Th>
              <Th>Tempo mín.</Th>
              <Th>Meta mensal</Th>
              <Th>Meta semanal</Th>
              <Th>Fixo</Th>
              <Th>Bônus 100% / 150% / 200%</Th>
              <Th>Conexão</Th>
            </tr>
          </thead>
          <tbody>
            {CAREER_LEVELS.map((lv) => {
              const isCurrent = lv.level === currentLevelCode;
              return (
                <tr
                  key={lv.level}
                  className={cn(
                    "border-b border-border/50 transition-colors",
                    isCurrent && "font-semibold"
                  )}
                  style={
                    isCurrent
                      ? { background: `${lv.color}22` }
                      : { background: `${lv.color}08` }
                  }
                >
                  <td className="px-4 py-3">
                    <Badge style={{ background: lv.color }} className="text-white font-bold">
                      {lv.level}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{lv.title}</span>
                      {isCurrent && (
                        <Badge
                          className="text-white text-[10px]"
                          style={{ background: lv.color }}
                        >
                          Você está aqui
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lv.minTime}</td>
                  <td className="px-4 py-3">
                    {lv.monthlyGoal ? formatBRL(lv.monthlyGoal) : "—"}
                  </td>
                  <td className="px-4 py-3">{lv.weeklyGoalLabel}</td>
                  <td className="px-4 py-3">
                    {lv.fixedSalary !== null ? formatBRL(lv.fixedSalary) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{lv.bonusLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {lv.connection}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
