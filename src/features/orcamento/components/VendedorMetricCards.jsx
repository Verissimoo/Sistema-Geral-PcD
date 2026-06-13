import {
  FileStack, Send, CheckCircle2, DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/shared/lib/format";

export function VendedorMetricCards({ metrics }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        icon={<FileStack className="h-4 w-4" />}
        label="Total de Orçamentos"
        value={metrics.total}
      />
      <MetricCard
        icon={<Send className="h-4 w-4" />}
        label="Enviados"
        value={metrics.enviados}
        color="text-accent"
      />
      <MetricCard
        icon={<CheckCircle2 className="h-4 w-4" />}
        label="Aprovados"
        value={metrics.aprovados}
        color="text-success"
      />
      <MetricCard
        icon={<DollarSign className="h-4 w-4" />}
        label="Valor Aprovado"
        value={formatBRL(metrics.valorAprovado)}
        color="text-success"
        isText
      />
    </div>
  );
}

function MetricCard({ icon, label, value, color = "text-foreground", isText }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
          <span className={color}>{icon}</span>
          <span>{label}</span>
        </div>
        <div className={cn("font-bold", isText ? "text-lg" : "text-2xl", color)}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
