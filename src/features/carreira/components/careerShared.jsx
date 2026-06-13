import { Card, CardContent } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { Check, Clock } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const fmtMonth = (label) => label.charAt(0).toUpperCase() + label.slice(1);

// Util: clarear/escurecer hex
export function shade(hex, percent) {
  const h = hex.replace("#", "");
  const num = parseInt(h, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function MetricCard({ icon, label, value, color, progress, progressLabel }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className={color}>{icon}</span>
          <span>{label}</span>
        </div>
        <div className={cn("font-bold text-xl", color)}>{value}</div>
        {typeof progress === "number" && (
          <div className="mt-2 space-y-1">
            <Progress value={progress} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground">{progressLabel}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Line({ label, value, bold, muted }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className={cn("text-muted-foreground", bold && "text-foreground font-semibold")}>
        {label}
      </span>
      <span className={cn(bold && "font-bold text-base", muted && "text-xs text-muted-foreground")}>
        {value}
      </span>
    </div>
  );
}

export function CheckLine({ done, text }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {done ? (
        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
      ) : (
        <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <span className={cn(done ? "text-foreground" : "text-muted-foreground")}>{text}</span>
    </div>
  );
}

export function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
        {label}
      </div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}

export function Th({ children }) {
  return (
    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 py-3">
      {children}
    </th>
  );
}
