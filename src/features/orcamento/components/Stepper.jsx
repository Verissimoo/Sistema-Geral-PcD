import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

// ─── Stepper ────────────────────────────────────────────────────────
export default function Stepper({ currentStep, completedSteps }) {
  const steps = [
    { n: 1, label: "Cliente" },
    { n: 2, label: "Produto" },
    { n: 3, label: "Itinerário" },
    { n: 4, label: "Precificação" },
    { n: 5, label: "Gerar" },
  ];
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-2">
      {steps.map((s, idx) => {
        const isActive = currentStep === s.n;
        const isDone = completedSteps.includes(s.n);
        return (
          <div key={s.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2",
                  isDone && "bg-success border-success/30 text-white",
                  isActive && !isDone && "bg-warning border-warning/30 text-white shadow-md",
                  !isActive && !isDone && "bg-muted border-border text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-2 mt-[-18px] transition-colors",
                  completedSteps.includes(s.n) ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
