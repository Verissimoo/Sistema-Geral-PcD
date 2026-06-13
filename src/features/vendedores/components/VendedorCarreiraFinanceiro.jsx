import { Award, ChevronRight, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CAREER_LEVELS } from "@/features/carreira/careerPlan";
import { formatBRL } from "@/shared/lib/format";

export default function VendedorCarreiraFinanceiro({
  vendedor,
  idxAtual,
  nivelAtual,
  metaNivel,
  fixoMensal,
  pctMeta,
  proximoNivel,
  receitaMes,
  aReceberMes,
  comissaoMes,
  vendidosMes,
  lucroMes,
  comissaoTotal,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-5 h-5 text-warning" />
            Plano de Carreira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {CAREER_LEVELS.map((level, idx) => {
              const isCurrent = level.level === (vendedor.career_level || "N0");
              const isPast = idxAtual >= 0 && idx < idxAtual;
              return (
                <div key={level.level} className="flex items-center flex-shrink-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                      isCurrent
                        ? "bg-warning text-white ring-2 ring-warning/40 ring-offset-2"
                        : isPast
                          ? "bg-success text-white"
                          : "bg-bg-elevated text-text-muted"
                    }`}
                    title={`${level.level} — ${level.title}`}
                  >
                    {level.level}
                  </div>
                  {idx < CAREER_LEVELS.length - 1 && (
                    <div
                      className={`h-0.5 w-6 ${isPast ? "bg-success" : "bg-bg-elevated"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wider text-warning font-bold mb-1">
              Nível atual
            </p>
            <p className="text-xl font-semibold text-text-primary">
              {nivelAtual?.level} · {nivelAtual?.title || "Vendedor"}
            </p>
            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Meta mensal</p>
                <p className="font-bold">
                  {metaNivel > 0 ? formatBRL(metaNivel) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fixo</p>
                <p className="font-bold">{formatBRL(fixoMensal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Progresso</p>
                <p
                  className={`font-bold ${pctMeta >= 100 ? "text-success" : "text-text-primary"}`}
                >
                  {metaNivel > 0 ? `${pctMeta.toFixed(0)}%` : "—"}
                </p>
              </div>
            </div>
            {metaNivel > 0 && (
              <div className="w-full bg-bg-surface rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className={`h-2 transition-all duration-700 ${
                    pctMeta >= 100 ? "bg-success" : "bg-warning"
                  }`}
                  style={{ width: `${pctMeta}%` }}
                />
              </div>
            )}
          </div>

          {proximoNivel && (
            <div className="flex items-center gap-3 text-sm bg-bg-elevated rounded-lg p-3">
              <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Próximo nível</p>
                <p className="font-semibold">
                  {proximoNivel.level} · Meta{" "}
                  {Number(proximoNivel.monthlyGoal) > 0
                    ? formatBRL(proximoNivel.monthlyGoal)
                    : "a definir"}
                </p>
              </div>
              {Number(proximoNivel.monthlyGoal) > 0 && (
                <p className="text-xs text-warning font-medium">
                  Faltam{" "}
                  {formatBRL(
                    Math.max(0, Number(proximoNivel.monthlyGoal) - receitaMes)
                  )}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 bg-warning text-white border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            A receber no mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-3xl font-semibold">{formatBRL(aReceberMes)}</p>
          <div className="space-y-2 pt-3 border-t border-white/20">
            <div className="flex justify-between text-sm">
              <span className="text-warning">Fixo</span>
              <span className="font-semibold">{formatBRL(fixoMensal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-warning">
                Comissões ({vendidosMes.length}{" "}
                {vendidosMes.length === 1 ? "venda" : "vendas"})
              </span>
              <span className="font-semibold">{formatBRL(comissaoMes)}</span>
            </div>
          </div>
          <div className="pt-3 border-t border-white/20">
            <p className="text-xs text-warning">Lucro gerado no mês</p>
            <p className="text-lg font-bold">{formatBRL(lucroMes)}</p>
          </div>
          <div className="pt-3 border-t border-white/20">
            <p className="text-xs text-warning">Comissão histórica total</p>
            <p className="text-lg font-bold">{formatBRL(comissaoTotal)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
