import { useState, useEffect } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { supabase } from "@/shared/lib/supabase";
import { fmt, Th } from "./milhasShared";

// ─── Histórico de mudanças de preço ─────────────────────────────────
export function HistoricoPrecos({ active }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("pcd_miles_price_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Erro ao carregar histórico:", error);
          setHistory([]);
        } else {
          setHistory(data || []);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Carregando histórico...
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma alteração registrada ainda. As mudanças aparecem aqui após
          editar o custo ou venda de um programa existente.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <Th>Data</Th>
              <Th>Programa</Th>
              <Th>Compra (de → para)</Th>
              <Th>Venda (de → para)</Th>
              <Th>Alterado por</Th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => {
              const oldCost = Number(h.old_cost_per_thousand) || 0;
              const newCost = Number(h.new_cost_per_thousand) || 0;
              const oldSale = Number(h.old_sale_per_thousand) || 0;
              const newSale = Number(h.new_sale_per_thousand) || 0;
              const costDiff = newCost - oldCost;
              const saleDiff = newSale - oldSale;
              const isCostIncrease = costDiff > 0;
              const isSaleIncrease = saleDiff > 0;
              return (
                <tr key={h.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(h.changed_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium">{h.program_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-muted-foreground">{fmt(oldCost)}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <strong className={isCostIncrease ? "text-danger" : "text-success"}>
                        {fmt(newCost)}
                      </strong>
                    </div>
                    <div
                      className={cn(
                        "text-[10px] mt-0.5",
                        isCostIncrease ? "text-danger" : "text-success"
                      )}
                    >
                      {isCostIncrease ? "+" : ""}
                      {fmt(costDiff)}/mil
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-muted-foreground">{fmt(oldSale)}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <strong>{fmt(newSale)}</strong>
                    </div>
                    <div
                      className={cn(
                        "text-[10px] mt-0.5",
                        isSaleIncrease ? "text-success" : "text-warning"
                      )}
                    >
                      {isSaleIncrease ? "+" : ""}
                      {fmt(saleDiff)}/mil
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {h.changed_by_name || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
