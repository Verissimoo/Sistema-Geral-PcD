import { Plane, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { formatDateBR } from "@/shared/lib/format";

export function ParceiroItinerarioCard({ quote }) {
  const trechos = quote.itinerary?.trechos || [];
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plane className="h-4 w-4" /> Itinerário
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {trechos.map((t, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
              <span className="font-medium">
                {t.companhia} {t.numero_voo && `· ${t.numero_voo}`}
              </span>
            </div>
            <div className="mt-2 font-semibold">
              {t.origem_cidade || t.origem_iata} ({t.origem_iata}) → {t.destino_cidade || t.destino_iata} ({t.destino_iata})
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Saída {t.horario_saida} · Chegada {t.horario_chegada} · {t.duracao}
              {t.escalas > 0 && ` · ${t.escalas} escala(s) via ${t.aeroporto_escala || "—"}`}
            </div>
          </div>
        ))}
        <Separator className="my-1" />
        <div className="text-sm flex items-center gap-3 text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateBR(quote.dates?.departure)}
            {!quote.dates?.one_way && quote.dates?.return && ` → ${formatDateBR(quote.dates?.return)}`}
          </span>
          <span>· {quote.passengers} pax</span>
          {quote.ticket_type && <span>· Tipo: {quote.ticket_type}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
