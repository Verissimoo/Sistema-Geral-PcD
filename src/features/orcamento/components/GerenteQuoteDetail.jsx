import { useMemo } from "react";
import { AlertTriangle, RefreshCw, PlusCircle, FileText } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { computePricingTotals, computeCommission } from "@/shared/lib/pricingCalculator";
import { checkMilesPriceFreshness, FROZEN_STATUSES } from "@/features/orcamento/lib/priceFreshness";
import { formatBRL } from "@/shared/lib/format";

export function GerenteQuoteDetail({
  quote,
  onPDF,
  onNewQuoteForClient,
  milesTable = [],
  onRecalculatePrice,
}) {
  const isParceiro = quote.recipient_type === "parceiro";
  const totals = computePricingTotals(quote);
  const commission = computeCommission(quote);
  const multiPax = totals.passengers >= 2;
  const renderPerPaxHint = (perPax) =>
    multiPax ? (
      <div className="text-[10px] text-muted-foreground">
        {formatBRL(perPax)} × {totals.passengers}
      </div>
    ) : null;
  const freshness = useMemo(
    () => checkMilesPriceFreshness(quote, milesTable),
    [quote, milesTable]
  );
  const isFrozen = FROZEN_STATUSES.has(quote.status);
  return (
    <div className="space-y-4 text-sm">
      {!freshness.isFresh && (
        <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-warning mb-1">
                Preço da {freshness.programName} mudou desde esta cotação
                {freshness.multipleSegments &&
                  ` (e em mais ${freshness.segmentsStale - 1} trecho${freshness.segmentsStale - 1 === 1 ? "" : "s"})`}
              </p>
              <p className="text-sm text-warning mb-2">
                Cotado a <strong>{formatBRL(freshness.usedPrice)}/mil</strong>, hoje custa{" "}
                <strong>{formatBRL(freshness.currentPrice)}/mil</strong>
                <span className={freshness.priceChange > 0 ? "text-danger" : "text-success"}>
                  {" "}
                  ({freshness.priceChange > 0 ? "+" : ""}
                  {formatBRL(freshness.priceChange)}/mil)
                </span>
                .
              </p>
              {isFrozen ? (
                <p className="text-xs text-warning">
                  Esta cotação já está em <strong>{quote.status}</strong> — os valores
                  ficam congelados para auditoria.
                </p>
              ) : freshness.multipleSegments ? (
                <p className="text-xs text-warning">
                  Quebra de Trecho com múltiplos programas — a reprecificação precisa ser
                  feita criando uma nova cotação derivada.
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-warning/30 text-warning hover:bg-warning/10"
                  onClick={() => onRecalculatePrice?.(quote, freshness)}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Atualizar preço para o valor atual
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {!isParceiro && onNewQuoteForClient && (
        <Button
          onClick={onNewQuoteForClient}
          variant="outline"
          className="w-full gap-2 border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
        >
          <PlusCircle className="h-4 w-4" /> Nova cotação para este cliente
        </Button>
      )}
      {isParceiro ? (
        <>
          <DetailSection title="Parceiro">
            <DetailRow label="Nome" value={quote.partner_name} />
            {quote.partner_sale_value != null && (
              <DetailRow label="Preço final do parceiro" value={formatBRL(quote.partner_sale_value)} />
            )}
          </DetailSection>
          {quote.partner_client_data && (
            <DetailSection title="Cliente final (cadastrado pelo parceiro)">
              <DetailRow label="Nome" value={quote.partner_client_data.name} />
              <DetailRow label="Telefone" value={quote.partner_client_data.phone || "—"} />
              <DetailRow label="Email" value={quote.partner_client_data.email || "—"} />
            </DetailSection>
          )}
        </>
      ) : (
        <DetailSection title="Cliente">
          <DetailRow label="Nome" value={quote.client?.name} />
          <DetailRow label="Telefone" value={quote.client?.phone || "—"} />
          <DetailRow label="Origem" value={quote.client?.lead_origin || "—"} />
        </DetailSection>
      )}

      <DetailSection title="Vendedor">
        <DetailRow label="Nome" value={quote.seller_name || "—"} />
      </DetailSection>

      <DetailSection title="Itinerário">
        {(quote.itinerary?.trechos || []).map((t, i) => {
          const segs = Array.isArray(t.segmentos) ? t.segmentos : [];
          const hiddenIdx = segs.findIndex((s) => s && s.is_hidden_city_stop);
          const isHidden = hiddenIdx !== -1;
          const destinoReal = isHidden ? segs[hiddenIdx] : null;
          return (
          <div key={i} className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
              <span className="font-medium">{t.companhia} {t.numero_voo}</span>
              {isHidden && (
                <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px]">
                  ✈️ Hidden City
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
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
                <div className={`font-bold ${isHidden ? "line-through text-text-muted" : ""}`}>
                  {t.horario_chegada}
                </div>
                <div className={`text-xs ${isHidden ? "line-through text-text-muted" : "text-muted-foreground"}`}>
                  {t.destino_cidade} ({t.destino_iata})
                </div>
                {isHidden && destinoReal && (
                  <div className="text-[10px] text-accent font-semibold mt-0.5">
                    Pax desce em {destinoReal.destino_iata}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </DetailSection>

      <DetailSection title={multiPax ? `Precificação · ${totals.passengers} passageiros` : "Precificação"}>
        <DetailRow
          label="Tipo"
          value={
            quote.pricing?.type === "milhas"
              ? `Milhas — ${quote.pricing?.program || "—"}`
              : quote.pricing?.type === "milhas_dinheiro"
                ? `Milhas + Dinheiro — ${quote.pricing?.program || quote.pricing?.program_name || "Azul"}`
                : "Dinheiro"
          }
        />
        {quote.pricing?.type === "milhas_dinheiro" && (
          <>
            <DetailRow
              label="Milhas"
              value={`${(quote.pricing?.miles_qty || 0).toLocaleString("pt-BR")} mi/pax`}
            />
            <DetailRow
              label="Parte em dinheiro"
              value={`${formatBRL(quote.pricing?.cash_part || 0)}/pax`}
            />
          </>
        )}
        <DetailRow
          label="Custo total"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.costTotal)}</div>
              {renderPerPaxHint(totals.costPerPax)}
            </div>
          }
        />
        <DetailRow
          label="Nipon (mínimo)"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.niponTotal)}</div>
              {renderPerPaxHint(totals.niponPerPax)}
            </div>
          }
        />
        <DetailRow label="Venda" value={formatBRL(totals.saleTotal || quote.total_value)} />
        <DetailRow
          label="Margem bruta"
          value={
            <span className={totals.margemBruta >= 0 ? "text-success" : "text-danger"}>
              {formatBRL(totals.margemBruta)}
            </span>
          }
        />
        <DetailRow
          label={`Comissão total${commission.isCarteiraPropria ? " · Carteira própria 30%" : ""}`}
          value={formatBRL(commission.total)}
        />
      </DetailSection>

      <Separator />
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary text-primary-foreground">
        <span className="text-xs uppercase opacity-80">Valor total</span>
        <span className="text-xl font-bold">{formatBRL(quote.total_value)}</span>
      </div>

      <Button onClick={onPDF} className="w-full gap-2 bg-[#0D2B6E] hover:bg-[#0A2259] text-white">
        <FileText className="h-4 w-4" /> 📄 Abrir PDF
      </Button>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium text-right text-sm">{value || "—"}</span>
    </div>
  );
}
