import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/shared/lib/format";
import { formatBRLShort } from "@/features/metas/lib/metasUtils";
import Th from "@/features/metas/components/Th";

export default function LadderTable({ sortedGoals, goalRevenue, currentMonth }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Detalhamento da escada</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <Th>Mês</Th>
              <Th>Meta mensal</Th>
              <Th>Meta semanal</Th>
              <Th>Ticket R$2.500</Th>
              <Th>Ticket R$3.000</Th>
              <Th>Objetivo do mês</Th>
            </tr>
          </thead>
          <tbody>
            {sortedGoals.map((g) => {
              const revenue = goalRevenue(g);
              const pct =
                Number(g.monthly_target) > 0
                  ? (revenue / Number(g.monthly_target)) * 100
                  : 0;
              const isCurrentMonth = g.month === currentMonth;
              const isActive = g.status === "Ativa";
              const isDone = g.status === "Concluída";
              return (
                <tr
                  key={g.id}
                  className={cn(
                    "border-b border-border/50",
                    isCurrentMonth && "bg-warning/10 dark:bg-warning/10 font-medium"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{g.month_label}</span>
                      {isCurrentMonth && (
                        <Badge className="bg-warning hover:bg-warning text-white text-[9px] border-0">
                          Mês atual
                        </Badge>
                      )}
                      {isActive && !isCurrentMonth && (
                        <Badge className="bg-warning hover:bg-warning text-white text-[9px] border-0">
                          Ativa
                        </Badge>
                      )}
                      {isDone && (
                        <Badge className="bg-success hover:bg-success text-white text-[9px] border-0">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{formatBRL(g.monthly_target)}</div>
                    {(isCurrentMonth || isDone) && (
                      <div className="text-xs text-muted-foreground">
                        {formatBRLShort(revenue)} atingido ({pct.toFixed(0)}%)
                      </div>
                    )}
                    {g.month === "2026-10" && (
                      <div className="text-[10px] text-warning dark:text-warning mt-1">
                        R$ 220k gestão / R$ 200k oficial
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatBRL(g.weekly_target)}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm">
                      <strong>{g.ticket_2500_sales}</strong>{" "}
                      <span className="text-muted-foreground text-xs">vendas/mês</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">
                      <strong>{g.ticket_3000_sales}</strong>{" "}
                      <span className="text-muted-foreground text-xs">vendas/mês</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-md text-sm text-muted-foreground">
                    {g.objective}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
