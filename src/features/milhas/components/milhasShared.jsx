import { Badge } from "@/shared/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { daysSinceUpdate } from "@/features/milhas/milesHelper";

export const fmt = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const STOCK_CONFIG = {
  own: { label: "Estoque próprio", color: "bg-success/10 text-success border-success/30", dot: "bg-success" },
  supplier: { label: "Fornecedor", color: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning" },
  unavailable: { label: "Em falta", color: "bg-danger/10 text-danger border-danger/30", dot: "bg-danger" },
};

export function Th({ children, align = "left" }) {
  return (
    <th
      className={cn(
        "text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

export function MarginBadge({ pct }) {
  const cls = pct >= 20
    ? "bg-success/10 text-success border-success/30 hover:bg-success/10"
    : pct >= 10
    ? "bg-warning/10 text-warning border-warning/30 hover:bg-warning/10"
    : "bg-danger/10 text-danger border-danger/30 hover:bg-danger/10";
  return (
    <Badge className={cn("border font-bold", cls)}>
      {pct}%
    </Badge>
  );
}

export function UpdateBadge({ updatedDate }) {
  const days = daysSinceUpdate(updatedDate);
  if (days === null) return <Badge variant="outline">—</Badge>;
  if (days > 30) {
    return (
      <Badge className="bg-danger/10 text-danger border-danger/30 hover:bg-danger/10 gap-1 animate-pulse">
        <AlertTriangle className="h-3 w-3" /> Desatualizado
      </Badge>
    );
  }
  if (days > 14) {
    return (
      <Badge className="bg-warning/10 text-warning border-warning/30 hover:bg-warning/10 gap-1">
        <Clock className="h-3 w-3" /> Revisar em breve
      </Badge>
    );
  }
  return (
    <Badge className="bg-success/10 text-success border-success/30 hover:bg-success/10">
      Atualizado
    </Badge>
  );
}
