import {
  Clock, ChevronDown, ChevronUp, FileText, Plane,
  CheckCircle2, AlertTriangle, Users,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { computePricingTotals } from "@/shared/lib/pricingCalculator";
import { formatBRL, formatDateBR } from "@/shared/lib/format";
import { timeAgo } from "./emissoesUtils";
import { Section, Field } from "./EmissionSection";

export function EmissionCard({ quote, expanded, onToggle, onEmit }) {
  const ida = quote.itinerary?.trechos?.find((t) => t.tipo === "ida") || quote.itinerary?.trechos?.[0];
  const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
  const companhia = ida?.companhia || "—";
  const sentAt = quote.sent_to_emission_date || quote.created_date;
  const horasAguardando = sentAt
    ? Math.floor((Date.now() - new Date(sentAt).getTime()) / 3600000)
    : 0;
  const isUrgent = horasAguardando >= 24;
  const totals = computePricingTotals(quote);
  const multiPax = totals.passengers >= 2;

  return (
    <Card
      className={cn(
        "transition-colors",
        isUrgent
          ? "border border-danger/25 hover:border-danger/40"
          : "border border-border hover:border-border-strong"
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {quote.quote_number || `#${quote.id?.slice(0, 8)}`}
              </span>
              {isUrgent && (
                <Badge variant="danger" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Urgente
                </Badge>
              )}
            </div>
            <div className="font-bold text-base">{quote.client?.name || quote.partner_name || "—"}</div>
            <div className="text-xs text-muted-foreground">
              Vendedor: <strong>{quote.seller_name || "—"}</strong>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
              <span className="font-mono font-semibold">{route}</span>
              <Badge variant="secondary" className="text-[10px]">{companhia}</Badge>
              <Badge variant="outline" className="text-[10px]">{quote.ticket_type || "Normal"}</Badge>
              <span className="text-muted-foreground">
                Ida: {formatDateBR(quote.dates?.departure)}
                {!quote.dates?.one_way && ` · Volta: ${formatDateBR(quote.dates?.return)}`}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Valor pago</div>
            <div className="font-bold text-lg">
              {formatBRL(quote.final_paid_value || quote.total_value)}
            </div>
            <div className="text-xs text-text-muted flex items-center justify-end gap-1 mt-1">
              <Clock className="h-3 w-3" /> Enviado {timeAgo(sentAt)}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onToggle} className="gap-1.5">
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Ocultar detalhes
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Ver detalhes completos
              </>
            )}
          </Button>
          <Button
            variant="success"
            onClick={onEmit}
            className="gap-1.5 ml-auto"
          >
            <CheckCircle2 className="h-4 w-4" /> Marcar como Emitido + Anexar Voucher
          </Button>
        </div>

        {expanded && (
          <div className="border-t border-border pt-3 space-y-3 text-sm">
            <Section title="Itinerário">
              {(quote.itinerary?.trechos || []).map((t, i) => (
                <div key={i} className="p-2 rounded-lg bg-muted/40 border border-border space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
                    <span className="font-medium">{t.companhia} {t.numero_voo}</span>
                    {t.classe && <Badge variant="secondary" className="text-[10px]">{t.classe}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold">{t.horario_saida}</span>
                    <span className="text-muted-foreground">
                      {t.origem_cidade} ({t.origem_iata})
                    </span>
                    <Plane className="h-3 w-3 text-muted-foreground" />
                    <span className="font-bold">{t.horario_chegada}</span>
                    <span className="text-muted-foreground">
                      {t.destino_cidade} ({t.destino_iata})
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {t.duracao}
                      {t.escalas > 0 ? ` · ${t.escalas} escala` : " · direto"}
                    </span>
                  </div>
                  {t.bagagem && (
                    <div className="text-[11px] text-muted-foreground">Bagagem: {t.bagagem}</div>
                  )}
                </div>
              ))}
            </Section>

            <Section title={multiPax ? `Pricing · ${totals.passengers} passageiros` : "Pricing"}>
              <Field label="Tipo" value={quote.pricing?.type === "milhas" ? `Milhas — ${quote.pricing?.program || "—"}` : quote.pricing?.type === "milhas_dinheiro" ? `Milhas + Dinheiro — ${quote.pricing?.program || quote.pricing?.program_name || "Azul"}` : "Dinheiro"} />
              <Field
                label="Custo total"
                value={
                  multiPax
                    ? `${formatBRL(totals.costTotal)} (${formatBRL(totals.costPerPax)} × ${totals.passengers})`
                    : formatBRL(totals.costTotal)
                }
              />
              <Field
                label="Nipon (mínimo)"
                value={
                  multiPax
                    ? `${formatBRL(totals.niponTotal)} (${formatBRL(totals.niponPerPax)} × ${totals.passengers})`
                    : formatBRL(totals.niponTotal)
                }
              />
              <Field label="Valor de venda" value={formatBRL(quote.total_value)} />
              <Field label="Valor pago final" value={formatBRL(quote.final_paid_value)} />
            </Section>

            <Section title="Pagamento">
              <Field label="Forma" value={quote.payment_method || "—"} />
              <Field label="Responsável" value={quote.purchase_responsible || "—"} />
              {Array.isArray(quote.payment_installments) && quote.payment_installments.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Parcelas:</div>
                  {quote.payment_installments.map((inst, i) => (
                    <div key={i} className="text-xs flex justify-between border-b border-border/40 py-1">
                      <span>{i + 1}ª — {formatDateBR(inst.date)}</span>
                      <span className="font-semibold">{formatBRL(inst.value)}</span>
                    </div>
                  ))}
                </div>
              )}
              {quote.payment_proof_url && (
                <a
                  href={quote.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover text-sm font-semibold"
                >
                  <FileText className="h-3.5 w-3.5" /> Ver comprovante de pagamento
                </a>
              )}
            </Section>

            {Array.isArray(quote.passenger_data) && quote.passenger_data.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Passageiros ({quote.passenger_data.length})
                </div>
                <div className="space-y-2">
                  {quote.passenger_data.map((pax, idx) => (
                    <div key={idx} className="bg-bg-elevated rounded-md p-3 text-sm border border-border">
                      <p className="font-semibold mb-1">
                        {idx + 1}. {pax.full_name || "—"}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted">
                        <span>CPF: <strong>{pax.cpf || "—"}</strong></span>
                        <span>
                          Nascimento:{" "}
                          <strong>
                            {pax.birth_date
                              ? new Date(pax.birth_date + "T12:00:00").toLocaleDateString("pt-BR")
                              : "—"}
                          </strong>
                        </span>
                        {pax.passport && <span>Passaporte: <strong>{pax.passport}</strong></span>}
                        {pax.passport_expiry && (
                          <span>
                            Validade:{" "}
                            <strong>
                              {new Date(pax.passport_expiry + "T12:00:00").toLocaleDateString("pt-BR")}
                            </strong>
                          </span>
                        )}
                        {pax.nationality && <span>Nacionalidade: <strong>{pax.nationality}</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
