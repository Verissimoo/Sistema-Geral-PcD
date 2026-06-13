import { AlertTriangle, Plane, Trash2 } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { cn } from "@/shared/lib/utils";
import { isNextDayArrival } from "@/shared/lib/timeParser";

// ─── Card de segmento (voo individual) ─────────────────────────────
export default function SegmentoCard({
  segmento,
  segmentoIdx,
  trechoIdx,
  totalSegmentos,
  onUpdate,
  onRemove,
  isHiddenStop = false,
  isAfterHidden = false,
  hiddenDestinoIata = "",
}) {
  const showNextDayBadge = isNextDayArrival(segmento);

  return (
    <div
      className={cn(
        "rounded-lg p-4 space-y-3 border",
        isHiddenStop && "border-accent/30 ring-2 ring-accent/40 bg-accent/10",
        isAfterHidden && "border-border bg-bg-elevated opacity-60",
        !isHiddenStop && !isAfterHidden && "bg-bg-elevated border-border"
      )}
    >
      {isAfterHidden && (
        <div className="bg-danger/10 border border-danger/30 rounded p-2 text-xs text-danger flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Pax NÃO embarca neste segmento</strong> — destino real é {hiddenDestinoIata || "—"} (Hidden City)
          </span>
        </div>
      )}
      {/* Linha 1: Voo N + Companhia + Numero voo + Duração */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {totalSegmentos > 1 && (
            <span className="bg-bg-elevated text-text-primary px-2 py-0.5 rounded text-xs font-bold flex-shrink-0">
              VOO {segmentoIdx + 1}
            </span>
          )}
          <Input
            value={segmento.companhia || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "companhia", e.target.value)}
            placeholder="Companhia"
            className="h-8 max-w-[200px]"
          />
          <Input
            value={segmento.numero_voo || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "numero_voo", e.target.value)}
            className="h-8 w-28 text-xs font-mono"
            placeholder="LA3210"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={segmento.duracao || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "duracao", e.target.value)}
            placeholder="1h 55min"
            className={cn(
              "h-7 w-24 text-xs font-mono text-center",
              !segmento._duracao_manual && segmento.duracao && "bg-muted/40"
            )}
          />
          {totalSegmentos > 1 && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-danger hover:text-danger"
              onClick={onRemove}
              title="Remover segmento"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Linha 2: Origem → Destino visual */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        {/* ORIGEM */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              value={segmento.origem_iata || ""}
              onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "origem_iata", e.target.value.toUpperCase())}
              maxLength={3}
              className="h-9 w-16 text-base font-semibold text-center font-mono"
              placeholder="ORG"
            />
            <Input
              type="time"
              value={segmento.horario_saida || ""}
              onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "horario_saida", e.target.value)}
              className="h-9 flex-1 font-mono"
            />
          </div>
          <Input
            value={segmento.origem_cidade || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "origem_cidade", e.target.value)}
            placeholder="Cidade origem"
            className="h-7 text-xs"
          />
          <Input
            type="date"
            value={segmento.data_saida || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "data_saida", e.target.value || null)}
            className="h-7 text-xs"
          />
        </div>

        {/* SETA central */}
        <div className="flex flex-col items-center px-2 pt-2">
          <Plane className="w-5 h-5 text-text-muted rotate-90" />
          {showNextDayBadge && (
            <span
              className="text-[10px] text-warning font-bold bg-warning/10 px-2 py-0.5 rounded-full mt-1 whitespace-nowrap"
              title="Este voo chega no dia seguinte ao da saída"
            >
              ⚠️ +1 dia
            </span>
          )}
        </div>

        {/* DESTINO */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={segmento.horario_chegada || ""}
              onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "horario_chegada", e.target.value)}
              className="h-9 flex-1 font-mono"
            />
            <Input
              value={segmento.destino_iata || ""}
              onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "destino_iata", e.target.value.toUpperCase())}
              maxLength={3}
              className="h-9 w-16 text-base font-semibold text-center font-mono"
              placeholder="DST"
            />
          </div>
          <Input
            value={segmento.destino_cidade || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "destino_cidade", e.target.value)}
            placeholder="Cidade destino"
            className="h-7 text-xs"
          />
          <Input
            type="date"
            value={segmento.data_chegada || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "data_chegada", e.target.value || null)}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Checkbox Hidden City — só se houver escala (totalSegmentos > 1) e este
          NÃO é o último segmento, e não está sob outro hidden stop. */}
      {totalSegmentos > 1 && !isAfterHidden && segmentoIdx < totalSegmentos - 1 && (
        <div className="pt-2 border-t border-border">
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={isHiddenStop}
              onCheckedChange={(checked) =>
                onUpdate(trechoIdx, segmentoIdx, "is_hidden_city_stop", !!checked)
              }
              className="mt-0.5"
            />
            <div>
              <p className="text-xs font-semibold text-accent">
                ✈️ Hidden City — pax desce em {segmento.destino_iata || "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Marque se este é o destino real. Os segmentos seguintes deste trecho serão descartados.
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
