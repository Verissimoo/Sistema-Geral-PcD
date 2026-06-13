import { Plane, Palmtree, Check, Lock } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";

// ─── Bloco 2 — Produto ──────────────────────────────────────────────
export default function BlocoProduto({ formData, setFormData }) {
  const select = (p) => setFormData((prev) => ({ ...prev, product: p }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => select("aereo")}
        className={cn(
          "p-6 rounded-xl border-2 text-left transition-all",
          formData.product === "aereo"
            ? "border-warning/30 bg-warning/10 dark:bg-warning/10 shadow-md"
            : "border-border hover:border-primary/40 hover:bg-muted/30"
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-primary/10">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <div className="font-semibold">Aéreo</div>
          {formData.product === "aereo" && (
            <Check className="h-5 w-5 text-warning ml-auto" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Passagens aéreas nacionais e internacionais
        </p>
      </button>

      <div className="p-6 rounded-xl border-2 border-dashed border-border bg-muted/20 cursor-not-allowed opacity-70">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-muted">
            <Palmtree className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="font-semibold text-muted-foreground">Turismo</div>
          <Badge variant="secondary" className="ml-auto gap-1">
            <Lock className="h-3 w-3" /> Em breve
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Pacotes de turismo e cruzeiros
        </p>
      </div>
    </div>
  );
}
