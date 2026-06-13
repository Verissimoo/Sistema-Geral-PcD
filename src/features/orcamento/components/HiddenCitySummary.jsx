import { Card, CardContent } from "@/shared/ui/card";
import { getSegmentos, getEffectiveSegments } from "@/features/orcamento/lib/orcamentoHelpers";

export default function HiddenCitySummary({ trechos }) {
  const trechoIda = trechos?.find((t) => t.tipo === "ida") || trechos?.[0];
  if (!trechoIda) return null;
  const segs = getSegmentos(trechoIda);
  if (segs.length === 0) return null;
  const effectiveIda = getEffectiveSegments(trechoIda);
  const origemReal = effectiveIda[0] || segs[0];
  const destinoReal = effectiveIda[effectiveIda.length - 1] || segs[segs.length - 1];
  const isHiddenCity = (trechos || []).some((t) =>
    (t.segmentos || []).some((s) => s.is_hidden_city_stop)
  );
  if (!origemReal?.origem_iata && !destinoReal?.destino_iata) return null;

  return (
    <Card className="bg-bg-elevated text-text-primary border-border-strong">
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-warning font-bold mb-2">
          Destino real do passageiro
        </p>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-2xl font-semibold leading-none">{origemReal?.origem_iata || "—"}</p>
            <p className="text-xs text-text-muted mt-1 truncate">{origemReal?.origem_cidade || ""}</p>
          </div>
          <div className="text-2xl text-text-muted">→</div>
          <div className="text-right min-w-0">
            <p className="text-2xl font-semibold leading-none">{destinoReal?.destino_iata || "—"}</p>
            <p className="text-xs text-text-muted mt-1 truncate">{destinoReal?.destino_cidade || ""}</p>
          </div>
        </div>
        {isHiddenCity && (
          <div className="mt-3 pt-3 border-t border-white/15 text-xs text-warning flex items-start gap-2">
            <span>🎯</span>
            <span>
              Esta é uma cotação <strong>Hidden City</strong> — o pax usa o bilhete somente até a escala marcada e os trechos seguintes são descartados.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
