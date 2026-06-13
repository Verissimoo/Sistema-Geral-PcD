import { cn } from "@/shared/lib/utils";

export function MetricCard({ icon: Icon, iconColor, iconBg, label, value, subtext, extra, badge }) {
  return (
    <div className="bg-bg-surface rounded-md border border-border p-5 transition-colors hover:bg-bg-elevated">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        {badge && (
          <span className="text-xs text-text-muted font-medium tabular-nums">{badge}</span>
        )}
      </div>
      <p className="text-3xl font-semibold text-text-primary mb-0.5 tabular-nums">{value}</p>
      <p className="text-xs text-text-muted font-medium">{label}</p>
      {subtext && <p className="text-xs text-text-muted mt-2 tabular-nums">{subtext}</p>}
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}
