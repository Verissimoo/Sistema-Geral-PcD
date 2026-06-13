import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";

export function SummaryCard({ icon: Icon, label, value, isText, tone = "neutral" }) {
  const cardTone =
    tone === "warning" ? "bg-warning/10 border border-warning/30" : "border border-border";
  const iconWrap = {
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
    neutral: "bg-bg-elevated text-text-secondary",
  }[tone];
  const valueColor = tone === "warning" ? "text-warning" : "text-text-primary";
  return (
    <Card className={cardTone}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", iconWrap)}>
            <Icon className="w-4 h-4" />
          </div>
          <p className="text-xs uppercase tracking-wider text-text-muted font-medium">{label}</p>
        </div>
        <p className={cn("font-semibold tabular-nums", isText ? "text-xl" : "text-3xl", valueColor)}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
