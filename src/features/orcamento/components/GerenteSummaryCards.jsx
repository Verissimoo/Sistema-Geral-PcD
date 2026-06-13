import {
  FileStack, ShoppingCart, DollarSign, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/shared/lib/format";

export function GerenteSummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <SummaryCard
        icon={<FileStack className="h-4 w-4" />}
        label="Total"
        value={summary.total}
      />
      <SummaryCard
        icon={<DollarSign className="h-4 w-4 text-warning" />}
        label="Valor Total"
        value={formatBRL(summary.totalValue)}
        isText
      />
      <SummaryCard
        icon={<ShoppingCart className="h-4 w-4 text-success" />}
        label="Vendidos"
        value={summary.sold}
        color="text-success"
      />
      <SummaryCard
        icon={<DollarSign className="h-4 w-4 text-success" />}
        label="Receita Vendida"
        value={formatBRL(summary.revenueSold)}
        isText
        color="text-success"
      />
      <SummaryCard
        icon={<TrendingUp className="h-4 w-4 text-primary" />}
        label="Ticket Médio"
        value={formatBRL(summary.avgTicket)}
        isText
      />
    </div>
  );
}

function SummaryCard({ icon, label, value, color = "text-foreground", isText }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className={cn("font-bold", isText ? "text-lg" : "text-2xl", color)}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
