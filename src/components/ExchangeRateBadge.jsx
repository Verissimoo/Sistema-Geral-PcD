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
        "inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5",
        compact ? "text-xs" : "text-sm"
      )}
    >
      <span className="font-semibold text-blue-900">EUR/BRL</span>
      <span className="font-bold text-blue-700">R$ {rate.rate.toFixed(4)}</span>
      <span
        className={cn(
          "flex items-center gap-0.5 text-[10px] font-medium",
          isUp ? "text-red-600" : "text-green-600"
        )}
      >
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {rate.pctChange > 0 ? "+" : ""}
        {rate.pctChange.toFixed(2)}%
      </span>
      <button
        type="button"
        onClick={refresh}
        className="text-blue-500 hover:text-blue-700 transition"
        title="Atualizar cotação"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
}
