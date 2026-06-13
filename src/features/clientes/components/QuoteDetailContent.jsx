import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { computePricingTotals } from "@/shared/lib/pricingCalculator";
import { formatBRL } from "@/shared/lib/format";

export function QuoteDetailContent({ quote }) {
  const totals = computePricingTotals(quote);
  const multiPax = totals.passengers >= 2;
  const renderPerPaxHint = (perPax) =>
    multiPax ? (
      <div className="text-[10px] text-muted-foreground">
        {formatBRL(perPax)} × {totals.passengers}
      </div>
    ) : null;
  return (
    <div className="space-y-4 text-sm">
      <Section title="Cliente">
        <Row label="Nome" value={quote.client?.name} />
        <Row label="Telefone" value={quote.client?.phone || "—"} />
        <Row label="Origem" value={quote.client?.lead_origin || "—"} />
      </Section>

      <Section title="Itinerário">
        {(quote.itinerary?.trechos || []).map((t, i) => (
          <div key={i} className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
              <span className="font-medium">{t.companhia} {t.numero_voo}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div>
                <div className="font-bold">{t.horario_saida}</div>
                <div className="text-xs text-muted-foreground">
                  {t.origem_cidade} ({t.origem_iata})
                </div>
              </div>
              <div className="flex-1 text-center text-xs text-muted-foreground">
                {t.duracao}
                {t.escalas > 0 && ` · ${t.escalas} escala em ${t.aeroporto_escala}`}
                {(!t.escalas || t.escalas === 0) && " · direto"}
              </div>
              <div className="text-right">
                <div className="font-bold">{t.horario_chegada}</div>
                <div className="text-xs text-muted-foreground">
                  {t.destino_cidade} ({t.destino_iata})
                </div>
              </div>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Precificação">
        <Row label="Tipo" value={quote.pricing?.type === "milhas" ? `Milhas — ${quote.pricing?.program || "—"}` : quote.pricing?.type === "milhas_dinheiro" ? `Milhas + Dinheiro — ${quote.pricing?.program || quote.pricing?.program_name || "Azul"}` : "Dinheiro"} />
        <Row
          label="Custo total"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.costTotal)}</div>
              {renderPerPaxHint(totals.costPerPax)}
            </div>
          }
        />
        <Row
          label="Nipon (mínimo)"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.niponTotal)}</div>
              {renderPerPaxHint(totals.niponPerPax)}
            </div>
          }
        />
        <Row label="Venda" value={formatBRL(totals.saleTotal || quote.total_value)} />
      </Section>

      <Separator />
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary text-primary-foreground">
        <span className="text-xs uppercase opacity-80">Valor total</span>
        <span className="text-xl font-bold">{formatBRL(quote.total_value)}</span>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
