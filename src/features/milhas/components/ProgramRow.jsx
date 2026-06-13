import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Pencil, Trash2, Layers, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { getMarginPercent, daysSinceUpdate } from "@/features/milhas/milesHelper";
import { formatDateBR } from "@/shared/lib/format";
import { fmt, STOCK_CONFIG, MarginBadge, UpdateBadge } from "./milhasShared";

export function ProgramRow({ item, isAdmin, expanded, onToggleExpand, onEdit, onEditTiers, onDelete }) {
  const marginPct = getMarginPercent(item.cost_per_thousand, item.sale_per_thousand);
  const marginAbs = (item.sale_per_thousand || 0) - (item.cost_per_thousand || 0);
  const days = daysSinceUpdate(item.updated_date);

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
        <td className="px-6 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{item.program}</span>
            {(() => {
              const stock = STOCK_CONFIG[item.stock_status] || STOCK_CONFIG.supplier;
              return (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                    stock.color
                  )}
                >
                  {stock.label}
                </span>
              );
            })()}
            {item.has_variable_pricing && (
              <Badge className="bg-accent/10 text-accent border-accent/30 hover:bg-accent/10 text-[10px] gap-1 border">
                <Layers className="h-3 w-3" /> Preço variável
              </Badge>
            )}
          </div>
        </td>
        <td className="px-6 py-3">
          <div className="text-sm font-medium">{fmt(item.cost_per_thousand)}</div>
          {item.has_variable_pricing && (
            <div className="text-[10px] text-muted-foreground">(faixa base)</div>
          )}
        </td>
        <td className="px-6 py-3">
          <span className="text-sm font-bold text-primary">{fmt(item.sale_per_thousand)}</span>
        </td>
        <td className="px-6 py-3">
          <div className="space-y-0.5">
            <MarginBadge pct={marginPct} />
            <div className="text-[10px] text-muted-foreground">{fmt(marginAbs)} / mil</div>
          </div>
        </td>
        <td className="px-6 py-3">
          {item.has_variable_pricing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleExpand}
              className="h-7 gap-1.5 text-xs"
            >
              <Layers className="h-3 w-3" />
              Ver faixas
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Preço fixo</span>
          )}
        </td>
        <td className="px-6 py-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">{formatDateBR(item.updated_date)}</div>
            <div className="text-[10px] text-muted-foreground">
              {days !== null ? `há ${days} dias` : "—"}
            </div>
            <div className="mt-1">
              <UpdateBadge updatedDate={item.updated_date} />
            </div>
          </div>
        </td>
        {isAdmin && (
          <td className="px-6 py-3">
            <div className="flex items-center justify-end gap-1">
              {item.has_variable_pricing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-accent"
                  onClick={onEditTiers}
                  title="Editar faixas"
                >
                  <Layers className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={onEdit}
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-danger"
                onClick={onDelete}
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </td>
        )}
      </tr>

      {/* Expand: tabela de faixas */}
      {expanded && item.has_variable_pricing && (
        <tr>
          <td colSpan={isAdmin ? 7 : 6} className="bg-muted/20 px-6 py-4 border-b border-border">
            <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> Faixas de preço — {item.program}
            </div>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-2">Faixa</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-2">Custo/mil</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-2">Venda/mil</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-2">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {item.variable_tiers.map((t, idx) => {
                    const baseM = (item.sale_per_thousand || 0) - (item.cost_per_thousand || 0);
                    const hasOwnSale = t.sale != null && Number(t.sale) > 0;
                    const tierSale = hasOwnSale ? Number(t.sale) : Number(t.cost) + baseM;
                    const tierMarginPct = getMarginPercent(t.cost, tierSale);
                    return (
                      <tr key={idx} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-2 font-medium">{t.label}</td>
                        <td className="px-4 py-2">{fmt(t.cost)}</td>
                        <td className="px-4 py-2 font-semibold text-primary">
                          {fmt(tierSale)}
                          {!hasOwnSale && (
                            <span className="ml-1 text-[10px] text-muted-foreground">(auto)</span>
                          )}
                        </td>
                        <td className="px-4 py-2"><MarginBadge pct={tierMarginPct} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
