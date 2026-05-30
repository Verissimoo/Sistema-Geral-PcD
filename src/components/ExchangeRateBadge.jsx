import { useEurBrlRate } from "@/hooks/useExchangeRate";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ExchangeRateBadge({ compact = false }) {
  const { rate, loading, refresh } = useEurBrlRate();

  if (loading || !rate) {
    return (
      <div className="text-xs text-muted-foreground">Carregando cotação…</div>
    );
  }

  const isUp = rate.varBid > 0;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-lg px-3 py-1.5",
        compact ? "text-xs" : "text-sm"
      )}
    >
      <span className="font-semibold text-accent">EUR/BRL</span>
      <span className="font-bold text-accent">R$ {rate.rate.toFixed(4)}</span>
      <span
        className={cn(
          "flex items-center gap-0.5 text-[10px] font-medium",
          isUp ? "text-danger" : "text-success"
        )}
      >
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {rate.pctChange > 0 ? "+" : ""}
        {rate.pctChange.toFixed(2)}%
      </span>
      <button
        type="button"
        onClick={refresh}
        className="text-accent hover:text-accent transition"
        title="Atualizar cotação"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
}
