import { Plane, Palmtree, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

// ─── Bloco 2 — Produto ──────────────────────────────────────────────
// Aqui também se define o tipo de orçamento: "Aéreo" (só voo) ou "Pacote"
// (voo opcional + hotel + adicionais). A escolha grava product + quote_kind.
export default function BlocoProduto({ formData, setFormData }) {
  const select = (p) =>
    setFormData((prev) => ({
      ...prev,
      product: p,
      quote_kind: p === "pacote" ? "pacote" : "aereo",
    }));

  const cardCls = (active) =>
    cn(
      "p-6 rounded-xl border-2 text-left transition-all",
      active
        ? "border-warning/30 bg-warning/10 dark:bg-warning/10 shadow-md"
        : "border-border hover:border-primary/40 hover:bg-muted/30"
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button type="button" onClick={() => select("aereo")} className={cardCls(formData.product === "aereo")}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-primary/10">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <div className="font-semibold">Aéreo</div>
          {formData.product === "aereo" && <Check className="h-5 w-5 text-warning ml-auto" />}
        </div>
        <p className="text-sm text-muted-foreground">
          Passagens aéreas nacionais e internacionais
        </p>
      </button>

      <button type="button" onClick={() => select("pacote")} className={cardCls(formData.product === "pacote")}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-primary/10">
            <Palmtree className="h-6 w-6 text-primary" />
          </div>
          <div className="font-semibold">Pacote</div>
          {formData.product === "pacote" && <Check className="h-5 w-5 text-warning ml-auto" />}
        </div>
        <p className="text-sm text-muted-foreground">
          Voo (opcional) + hotel + adicionais — pacote de viagem
        </p>
      </button>
    </div>
  );
}
