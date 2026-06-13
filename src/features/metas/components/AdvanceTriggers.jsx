import { ChevronRight, CheckCircle2, Clock, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { STRETCH_TRIGGERS } from "@/features/metas/lib/metasUtils";
import Th from "@/features/metas/components/Th";

export default function AdvanceTriggers({ sortedGoals, goalRevenue }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" /> Gatilhos de Avanço
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Condições para avançar para o próximo degrau
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <Th>Fechamento</Th>
                <Th>Se bater</Th>
                <Th>Próximo passo</Th>
              </tr>
            </thead>
            <tbody>
              {sortedGoals.map((g) => {
                const revenue = goalRevenue(g);
                const reached = revenue >= Number(g.monthly_target || 0) && Number(g.monthly_target) > 0;
                return (
                  <tr key={g.id} className="border-b border-border/50">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {reached ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground/60" />
                        )}
                        {g.month_label}
                      </div>
                    </td>
                    <td className="px-4 py-3">{g.advance_condition}</td>
                    <td className="px-4 py-3 text-muted-foreground">{g.advance_next_step}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Separator />

        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Award className="h-3.5 w-3.5 text-warning" /> Cenários stretch
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {STRETCH_TRIGGERS.map((s) => (
              <Card key={s.label} className="border-2 border-warning/30 bg-warning/10">
                <CardContent className="p-4 space-y-2">
                  <Badge className="bg-warning hover:bg-warning text-white border-0 w-fit">
                    {s.label}
                  </Badge>
                  <div className="text-sm font-medium">{s.condition}</div>
                  <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{s.next}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
