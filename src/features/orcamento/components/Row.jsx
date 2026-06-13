import { cn } from "@/shared/lib/utils";

export default function Row({ label, value, bold, accent, muted, className }) {
  return (
    <div className={cn("flex items-center justify-between", muted && "text-xs", className)}>
      <span className={cn(
        "text-muted-foreground",
        bold && "text-foreground font-medium",
        muted && "text-muted-foreground/70"
      )}>
        {label}
      </span>
      <span className={cn(
        bold && "font-bold",
        accent && "text-primary",
        muted && "text-muted-foreground/80"
      )}>{value}</span>
    </div>
  );
}
