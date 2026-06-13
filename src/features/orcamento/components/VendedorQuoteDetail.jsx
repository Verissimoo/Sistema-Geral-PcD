import { useMemo } from "react";
import {
  AlertTriangle, RefreshCw, PlusCircle, Copy, Check, FileText,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Textarea } from "@/shared/ui/textarea";
import { Separator } from "@/shared/ui/separator";
import { computePricingTotals, computeCommission } from "@/shared/lib/pricingCalculator";
import { checkMilesPriceFreshness, FROZEN_STATUSES } from "@/features/orcamento/lib/priceFreshness";
import { formatBRL, formatDateBR } from "@/shared/lib/format";

export function VendedorQuoteDetail({
  quote,
  onCopyWhatsapp,
  copied,
  onPDF,
  onNewQuoteForClient,
  milesTable = [],
  onRecalculatePrice,
}) {
  const isParceiroQuote = quote.recipient_type === "parceiro";
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
      {/* Snapshot de preço desatualizado em relação à tabela de milhas atual */}
      {!freshness.isFresh && (
        <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-warning mb-1">
                Preço da {freshness.programName} mudou desde esta cotação
                {freshness.multipleSegments && ` (e em mais ${freshness.segmentsStale - 1} trecho${freshness.segmentsStale - 1 === 1 ? "" : "s"})`}
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
                  Esta cotação já está no status <strong>{quote.status}</strong> — os valores
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

      {/* Cliente */}
      <Section title="Cliente">
        <Field label="Nome" value={quote.client?.name} />
        <Field label="Telefone" value={quote.client?.phone || "—"} />
        <Field label="Origem do lead" value={quote.client?.lead_origin || "—"} />
      </Section>

      {/* Nova cotação para o mesmo cliente */}
      {!isParceiroQuote && onNewQuoteForClient && (
        <Button
          onClick={onNewQuoteForClient}
          variant="outline"
          className="w-full gap-2 border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
        >
          <PlusCircle className="h-4 w-4" /> Nova cotação para este cliente
        </Button>
      )}

      {/* Itinerário */}
      <Section title="Itinerário">
        {(quote.itinerary?.trechos || []).map((t, i) => {
          const segs = Array.isArray(t.segmentos) ? t.segmentos : [];
          const hiddenIdx = segs.findIndex((s) => s && s.is_hidden_city_stop);
          const isHidden = hiddenIdx !== -1;
          const destinoReal = isHidden ? segs[hiddenIdx] : null;
          return (
          <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
              <span className="font-medium">{t.companhia} {t.numero_voo}</span>
              {isHidden && (
                <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px]">
                  ✈️ Hidden City
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div>
                <div className="font-bold text-base">{t.horario_saida}</div>
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
                <div className={`font-bold text-base ${isHidden ? "line-through text-text-muted" : ""}`}>
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
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Field label="Ida" value={formatDateBR(quote.dates?.departure)} />
          <Field
            label="Volta"
            value={quote.dates?.one_way ? "Somente ida" : formatDateBR(quote.dates?.return)}
          />
          <Field label="Passageiros" value={quote.passengers || 1} />
        </div>
      </Section>

      {/* Precificação — totais já consideram múltiplos passageiros. */}
      <Section title={multiPax ? `Precificação · ${totals.passengers} passageiros` : "Precificação"}>
        <Field
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
            <Field
              label="Milhas"
              value={`${(quote.pricing?.miles_qty || 0).toLocaleString("pt-BR")} mi/pax`}
            />
            <Field
              label="Parte em dinheiro"
              value={`${formatBRL(quote.pricing?.cash_part || 0)}/pax`}
            />
          </>
        )}
        <Field
          label="Custo total"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.costTotal)}</div>
              {renderPerPaxHint(totals.costPerPax)}
            </div>
          }
        />
        <Field
          label="Nipon (mínimo)"
          value={
            <div className="text-right">
              <div>{formatBRL(totals.niponTotal)}</div>
              {renderPerPaxHint(totals.niponPerPax)}
            </div>
          }
        />
        <Field label="Venda" value={formatBRL(totals.saleTotal || quote.total_value)} />
        <Field
          label={`Margem bruta`}
          value={
            <span className={totals.margemBruta >= 0 ? "text-success" : "text-danger"}>
              {formatBRL(totals.margemBruta)}
            </span>
          }
        />
        <Field
          label={`Comissão total${commission.isCarteiraPropria ? " · Carteira própria 30%" : ""}`}
          value={formatBRL(commission.total)}
        />
      </Section>

      {/* Serviços */}
      {(quote.services?.insurance?.active || quote.services?.transfer?.active || quote.additional) && (
        <Section title="Serviços e adicionais">
          {quote.services?.insurance?.active && (
            <Field label="Seguro Viagem" value={formatBRL(quote.services.insurance.value)} />
          )}
          {quote.services?.transfer?.active && (
            <Field label="Transfer" value={formatBRL(quote.services.transfer.value)} />
          )}
          {quote.additional && (
            <Field
              label={quote.additional.description || "Adicional"}
              value={formatBRL(quote.additional.value)}
            />
          )}
        </Section>
      )}

      {/* Concorrência */}
      {quote.competitor && (
        <Section title="Concorrência">
          <Field label="Empresa" value={quote.competitor.name} />
          <Field label="Valor" value={formatBRL(quote.competitor.value)} />
          <Field label="Tarifa" value={quote.competitor.fare_type} />
        </Section>
      )}

      {/* Total */}
      <div className="p-4 rounded-lg bg-primary text-primary-foreground flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide opacity-80">Valor total</span>
        <span className="text-2xl font-bold">{formatBRL(quote.total_value)}</span>
      </div>

      {/* WhatsApp */}
      {quote.whatsapp_text && (
        <Section title="Texto WhatsApp">
          <Textarea
            readOnly
            value={quote.whatsapp_text}
            className="min-h-[200px] font-mono text-xs"
          />
          <Button onClick={onCopyWhatsapp} variant="outline" className="gap-2 w-full">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar texto"}
          </Button>
        </Section>
      )}

      <Separator />
      <Button onClick={onPDF} className="w-full bg-[#0D2B6E] hover:bg-[#0A2259] text-white gap-2 h-11">
        <FileText className="h-4 w-4" /> 📄 Baixar PDF
      </Button>
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

function Field({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
