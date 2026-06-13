import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";

export function MetricCard({ icon, label, value, subtext, color }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className={color}>{icon}</span>
          <span>{label}</span>
        </div>
        <div className={cn("font-bold text-lg", color)}>{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtext}</div>
      </CardContent>
    </Card>
  );
}
